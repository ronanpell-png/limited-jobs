import { differenceInDays } from "date-fns";
import { db } from "@/lib/db";
import { REFUND_ELIGIBLE_DAYS } from "@/lib/config";
import {
  DomainError,
  DuplicateApplicationError,
  ForbiddenError,
  JobPausedError,
  NotFoundError,
} from "@/lib/errors";
import {
  refundApplicationCredit,
  spendApplicationCredit,
} from "@/lib/applications/budget";
import { audit } from "@/lib/security/audit";
import type { Application } from "@prisma/client";

/**
 * Submit an application atomically:
 *   1. Lock the job cap row and the seeker user row (FOR UPDATE) so
 *      concurrent submissions serialize.
 *   2. Verify the job is open and below its cap.
 *   3. Verify and spend the seeker's budget.
 *   4. Create the application, bump the cap, autopause at the limit.
 *
 * Replay-safe: if an application with the same idempotencyKey exists,
 * it is returned as-is without spending budget again.
 */
export async function submitApplication(params: {
  jobId: string;
  seekerId: string;
  intentStatement: string;
  idempotencyKey: string;
}): Promise<Application> {
  const { jobId, seekerId, intentStatement, idempotencyKey } = params;

  const existingByKey = await db.application.findUnique({
    where: { idempotencyKey },
  });
  if (existingByKey) return existingByKey;

  return db.$transaction(
    async (tx) => {
      // Serialize per-job and per-seeker. Row locks are released on commit.
      await tx.$queryRaw`SELECT "jobId" FROM "JobCapState" WHERE "jobId" = ${jobId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${seekerId} FOR UPDATE`;

      const job = await tx.job.findUnique({
        where: { id: jobId },
        include: { capState: true },
      });
      if (!job || job.status === "DRAFT") throw new NotFoundError("Job not found");
      if (job.status !== "OPEN" || !job.capState || job.capState.isPaused) {
        throw new JobPausedError();
      }
      if (job.closesAt && job.closesAt < new Date()) {
        throw new JobPausedError("This role is no longer accepting applications");
      }

      const duplicate = await tx.application.findUnique({
        where: { jobId_seekerId: { jobId, seekerId } },
      });
      if (duplicate && duplicate.status !== "WITHDRAWN") {
        throw new DuplicateApplicationError();
      }
      if (duplicate) {
        // Withdrawn earlier — re-applying is not allowed in MVP.
        throw new DuplicateApplicationError(
          "You previously withdrew from this job and cannot re-apply"
        );
      }

      // Reject copy-paste intent statements (exact match against own history).
      const reused = await tx.application.findFirst({
        where: { seekerId, intentStatement },
        select: { id: true },
      });
      if (reused) {
        throw new DomainError(
          "You've used this exact statement before — tailor it to this company",
          "INTENT_REUSED"
        );
      }

      const application = await tx.application.create({
        data: { jobId, seekerId, intentStatement, idempotencyKey },
      });

      await spendApplicationCredit(seekerId, application.id, tx);

      const newCount = job.capState.applicationCount + 1;
      const hitCap = newCount >= job.maxApplications;
      await tx.jobCapState.update({
        where: { jobId },
        data: {
          applicationCount: newCount,
          isPaused: hitCap,
          pausedAt: hitCap ? new Date() : undefined,
        },
      });
      if (hitCap) {
        await tx.job.update({ where: { id: jobId }, data: { status: "PAUSED" } });
        await audit(
          {
            action: "job.pause",
            targetType: "Job",
            targetId: jobId,
            metadata: { reason: "cap_reached", applicationCount: newCount },
          },
          tx
        );
      }

      await audit(
        {
          actorId: seekerId,
          action: "application.submit",
          targetType: "Application",
          targetId: application.id,
          metadata: { jobId },
        },
        tx
      );

      return application;
    },
    { isolationLevel: "ReadCommitted" }
  );
}

/**
 * Withdraw an application. Refunds one budget credit when the application
 * is at least REFUND_ELIGIBLE_DAYS old and the employer never responded.
 * One refund per application, ever.
 */
export async function withdrawApplication(params: {
  applicationId: string;
  seekerId: string;
}): Promise<{ refunded: boolean }> {
  const { applicationId, seekerId } = params;

  return db.$transaction(async (tx) => {
    const application = await tx.application.findUnique({
      where: { id: applicationId },
    });
    if (!application) throw new NotFoundError("Application not found");
    if (application.seekerId !== seekerId) throw new ForbiddenError();
    if (application.status === "WITHDRAWN") {
      throw new DomainError("Already withdrawn", "ALREADY_WITHDRAWN");
    }
    if (application.status === "HIRED") {
      throw new DomainError("You were hired for this role", "ALREADY_HIRED");
    }

    const ageDays = differenceInDays(new Date(), application.submittedAt);
    const noResponse =
      application.status === "SUBMITTED" && application.respondedAt === null;
    const refundEligible =
      ageDays >= REFUND_ELIGIBLE_DAYS && noResponse && !application.budgetRefunded;

    await tx.application.update({
      where: { id: applicationId },
      data: {
        status: "WITHDRAWN",
        withdrawnAt: new Date(),
        budgetRefunded: refundEligible ? true : application.budgetRefunded,
      },
    });

    // Withdrawn applications free a slot in the job's cap.
    await tx.jobCapState.updateMany({
      where: { jobId: application.jobId, applicationCount: { gt: 0 } },
      data: { applicationCount: { decrement: 1 } },
    });

    if (refundEligible) {
      await refundApplicationCredit(seekerId, applicationId, tx);
      await audit(
        {
          actorId: seekerId,
          action: "application.refund",
          targetType: "Application",
          targetId: applicationId,
        },
        tx
      );
    }

    await audit(
      {
        actorId: seekerId,
        action: "application.withdraw",
        targetType: "Application",
        targetId: applicationId,
        metadata: { refunded: refundEligible },
      },
      tx
    );

    return { refunded: refundEligible };
  });
}
