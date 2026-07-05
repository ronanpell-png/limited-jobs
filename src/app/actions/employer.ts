"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth/session";
import { requireApplicationAccess, requireJobOwner } from "@/lib/auth/guards";
import {
  applicationStatusSchema,
  employerOnboardingSchema,
  jobPostSchema,
} from "@/lib/validations";
import { publishJob, reopenJob } from "@/lib/jobs/cap";
import { audit } from "@/lib/security/audit";
import { toSafeMessage, ValidationError } from "@/lib/errors";
import { sendEmail, applicationStatusEmail } from "@/lib/email";
import type { ActionResult } from "@/app/actions/seeker";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "company"
  );
}

/**
 * Accept an employer invite (MVP: employers are invite-only). The invite
 * token grants EMPLOYER role and creates/joins the company — role changes
 * happen server-side only.
 */
export async function acceptEmployerInvite(token: string): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const invite = await db.employerInvite.findUnique({ where: { token } });
    if (!invite || invite.expiresAt < new Date()) {
      return { ok: false, error: "This invite is invalid or has expired" };
    }
    if (invite.acceptedAt) {
      return { ok: false, error: "This invite was already used" };
    }
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return {
        ok: false,
        error: "This invite was issued for a different email address",
      };
    }

    await db.$transaction(async (tx) => {
      await tx.employerInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { role: "EMPLOYER" },
      });
      await tx.employerProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
      await audit(
        {
          actorId: user.id,
          action: "user.role_change",
          targetType: "User",
          targetId: user.id,
          metadata: { newRole: "EMPLOYER", via: "invite", inviteId: invite.id },
        },
        tx
      );
    });
  } catch (err) {
    return { ok: false, error: toSafeMessage(err) };
  }
  redirect("/employer/onboarding");
}

/** Create the employer's company profile. */
export async function completeEmployerOnboarding(
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireRole("EMPLOYER");

    const parsed = employerOnboardingSchema.safeParse({
      companyName: formData.get("companyName"),
      website: formData.get("website") ?? "",
      description: formData.get("description") || undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }

    const existing = await db.companyMember.findFirst({
      where: { userId: user.id },
    });
    if (existing) {
      return { ok: false, error: "You already belong to a company" };
    }

    const baseSlug = slugify(parsed.data.companyName);
    let slug = baseSlug;
    for (let i = 2; await db.company.findUnique({ where: { slug } }); i++) {
      slug = `${baseSlug}-${i}`;
    }

    await db.company.create({
      data: {
        name: parsed.data.companyName,
        slug,
        website: parsed.data.website || null,
        description: parsed.data.description,
        members: { create: { userId: user.id } },
      },
    });
  } catch (err) {
    return { ok: false, error: toSafeMessage(err) };
  }
  redirect("/employer/jobs");
}

/** Create a job (draft) and publish it immediately. */
export async function createJob(formData: FormData): Promise<ActionResult> {
  let jobId: string;
  try {
    const user = await requireRole("EMPLOYER");
    const membership = await db.companyMember.findFirst({
      where: { userId: user.id },
    });
    if (!membership) {
      return { ok: false, error: "Set up your company first" };
    }

    const parsed = jobPostSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
      locationType: formData.get("locationType"),
      location: formData.get("location") ?? "",
      employmentType: formData.get("employmentType"),
      salaryMin: formData.get("salaryMin") || undefined,
      salaryMax: formData.get("salaryMax") || undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }

    const job = await db.job.create({
      data: {
        companyId: membership.companyId,
        title: parsed.data.title,
        description: parsed.data.description,
        locationType: parsed.data.locationType,
        location: parsed.data.location || null,
        employmentType: parsed.data.employmentType,
        salaryMin: parsed.data.salaryMin,
        salaryMax: parsed.data.salaryMax,
      },
    });
    await publishJob(job.id, user.id);
    jobId = job.id;
  } catch (err) {
    return { ok: false, error: toSafeMessage(err) };
  }
  redirect(`/employer/jobs/${jobId}`);
}

/** Reopen a paused job (adds capacity, restarts the window). */
export async function reopenMyJob(jobId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("EMPLOYER");
    await requireJobOwner(jobId, user.id);
    await reopenJob(jobId, user.id);
    revalidatePath(`/employer/jobs/${jobId}`);
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true, message: "Job reopened with additional capacity" };
  } catch (err) {
    return { ok: false, error: toSafeMessage(err) };
  }
}

/** Close a job permanently. */
export async function closeMyJob(jobId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("EMPLOYER");
    await requireJobOwner(jobId, user.id);
    await db.$transaction(async (tx) => {
      await tx.job.update({ where: { id: jobId }, data: { status: "CLOSED" } });
      await tx.jobCapState.updateMany({
        where: { jobId },
        data: { isPaused: true, pausedAt: new Date() },
      });
      await audit(
        { actorId: user.id, action: "job.close", targetType: "Job", targetId: jobId },
        tx
      );
    });
    revalidatePath(`/employer/jobs/${jobId}`);
    return { ok: true, message: "Job closed" };
  } catch (err) {
    return { ok: false, error: toSafeMessage(err) };
  }
}

/** Update an applicant's status; notifies the seeker by email. */
export async function updateApplicationStatus(
  applicationId: string,
  status: string
): Promise<ActionResult> {
  try {
    const user = await requireRole("EMPLOYER");
    const parsed = applicationStatusSchema.safeParse(status);
    if (!parsed.success) throw new ValidationError("Invalid status");

    const { application, isEmployer } = await requireApplicationAccess(
      applicationId,
      user.id
    );
    if (!isEmployer) {
      return { ok: false, error: "Only the employer can update status" };
    }
    if (application.status === "WITHDRAWN") {
      return { ok: false, error: "This application was withdrawn" };
    }

    await db.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: parsed.data,
          respondedAt: application.respondedAt ?? new Date(),
        },
      });
      await audit(
        {
          actorId: user.id,
          action: "application.status_change",
          targetType: "Application",
          targetId: applicationId,
          metadata: { from: application.status, to: parsed.data },
        },
        tx
      );
    });

    const job = await db.job.findUnique({
      where: { id: application.jobId },
      include: { company: true },
    });
    if (job) {
      const email = applicationStatusEmail({
        jobTitle: job.title,
        companyName: job.company.name,
        status: parsed.data,
      });
      await sendEmail({ to: application.seeker.email, ...email });
    }

    revalidatePath(`/employer/jobs/${application.jobId}`);
    return { ok: true, message: `Marked as ${parsed.data.toLowerCase()}` };
  } catch (err) {
    return { ok: false, error: toSafeMessage(err) };
  }
}
