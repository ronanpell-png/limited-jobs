"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth/session";
import { seekerOnboardingSchema, applySchema } from "@/lib/validations";
import { submitApplication, withdrawApplication } from "@/lib/applications/submit";
import { saveResume } from "@/lib/security/resume-storage";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/request";
import { toSafeMessage } from "@/lib/errors";
import { sendEmail, newApplicationEmail, jobCapReachedEmail } from "@/lib/email";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/** Seeker onboarding: profile fields + optional resume PDF. */
export async function completeSeekerOnboarding(
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role !== "SEEKER") {
      return { ok: false, error: "Only seekers can complete this step" };
    }

    const parsed = seekerOnboardingSchema.safeParse({
      headline: formData.get("headline"),
      bio: formData.get("bio") || undefined,
      skills: String(formData.get("skills") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }

    let resumeKey: string | undefined;
    let resumeHash: string | undefined;
    const resume = formData.get("resume");
    if (resume instanceof File && resume.size > 0) {
      await enforceRateLimit("upload_user", user.id);
      const saved = await saveResume(
        user.id,
        Buffer.from(await resume.arrayBuffer())
      );
      resumeKey = saved.key;
      resumeHash = saved.hash;
    }

    await db.seekerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        headline: parsed.data.headline,
        bio: parsed.data.bio,
        skills: parsed.data.skills,
        resumeKey,
        resumeHash,
      },
      update: {
        headline: parsed.data.headline,
        bio: parsed.data.bio,
        skills: parsed.data.skills,
        ...(resumeKey ? { resumeKey, resumeHash } : {}),
      },
    });
  } catch (err) {
    return { ok: false, error: toSafeMessage(err) };
  }
  redirect("/dashboard");
}

/** Apply to a job: honeypot, rate limits, then the atomic engine call. */
export async function applyToJob(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole("SEEKER");

    const parsed = applySchema.safeParse({
      jobId: formData.get("jobId"),
      intentStatement: formData.get("intentStatement"),
      idempotencyKey: formData.get("idempotencyKey"),
      website: formData.get("website") ?? "",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }

    // Honeypot triggered: pretend success, tell the bot nothing.
    if (parsed.data.website) {
      return { ok: true, message: "Application sent" };
    }

    await enforceRateLimit("apply_user", user.id);
    await enforceRateLimit("apply_ip", await clientIp());

    // Note: never call redirect() inside this try — Next.js redirects work
    // by throwing, and the catch below would swallow them.
    const profile = await db.seekerProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) {
      return { ok: false, error: "Complete your profile before applying" };
    }

    await submitApplication({
      jobId: parsed.data.jobId,
      seekerId: user.id,
      intentStatement: parsed.data.intentStatement,
      idempotencyKey: parsed.data.idempotencyKey,
    });

    // Notify employers (best-effort, outside the transaction).
    const job = await db.job.findUnique({
      where: { id: parsed.data.jobId },
      include: {
        capState: true,
        company: { include: { members: { include: { user: true } } } },
      },
    });
    if (job) {
      const emails = job.company.members.map((m) => m.user.email);
      const notice = newApplicationEmail({
        jobTitle: job.title,
        applicantHeadline: profile.headline,
      });
      for (const to of emails) await sendEmail({ to, ...notice });

      if (job.capState?.isPaused) {
        const capNotice = jobCapReachedEmail({
          jobTitle: job.title,
          cap: job.maxApplications,
        });
        for (const to of emails) await sendEmail({ to, ...capNotice });
      }
    }

    revalidatePath("/dashboard");
    revalidatePath(`/jobs/${parsed.data.jobId}`);
    return { ok: true, message: "Application sent" };
  } catch (err) {
    return { ok: false, error: toSafeMessage(err) };
  }
}

/** Save/unsave a job on the seeker's shortlist. Costs nothing. */
export async function toggleSaveJob(
  jobId: string
): Promise<ActionResult & { saved?: boolean }> {
  try {
    const user = await requireRole("SEEKER");

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { id: true, status: true },
    });
    if (!job || job.status === "DRAFT") {
      return { ok: false, error: "Job not found" };
    }

    const existing = await db.savedJob.findUnique({
      where: { seekerId_jobId: { seekerId: user.id, jobId } },
    });
    let saved: boolean;
    if (existing) {
      await db.savedJob.delete({ where: { id: existing.id } });
      saved = false;
    } else {
      await db.savedJob.create({ data: { seekerId: user.id, jobId } });
      saved = true;
    }

    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/dashboard");
    return { ok: true, saved };
  } catch (err) {
    return { ok: false, error: toSafeMessage(err) };
  }
}

/** Withdraw an application (refund handled by the engine). */
export async function withdrawMyApplication(
  applicationId: string
): Promise<ActionResult> {
  try {
    const user = await requireRole("SEEKER");
    const { refunded } = await withdrawApplication({
      applicationId,
      seekerId: user.id,
    });
    revalidatePath("/dashboard");
    return {
      ok: true,
      message: refunded
        ? "Withdrawn — 1 application credit refunded"
        : "Application withdrawn",
    };
  } catch (err) {
    return { ok: false, error: toSafeMessage(err) };
  }
}
