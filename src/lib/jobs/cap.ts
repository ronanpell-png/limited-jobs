import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { JOB_OPEN_DAYS, REOPEN_EXTRA_SLOTS } from "@/lib/config";
import { DomainError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";

/**
 * Publish a draft job: set OPEN, stamp publish/close dates and create the
 * cap state row that submitApplication locks against.
 */
export async function publishJob(jobId: string, actorId: string) {
  const now = new Date();
  return db.$transaction(async (tx) => {
    const job = await tx.job.update({
      where: { id: jobId },
      data: {
        status: "OPEN",
        publishedAt: now,
        closesAt: addDays(now, JOB_OPEN_DAYS),
      },
    });
    await tx.jobCapState.upsert({
      where: { jobId },
      create: { jobId },
      update: { isPaused: false, pausedAt: null },
    });
    await audit(
      { actorId, action: "job.publish", targetType: "Job", targetId: jobId },
      tx
    );
    return job;
  });
}

/**
 * Employer reopens a paused job: adds REOPEN_EXTRA_SLOTS to the cap and
 * extends the application window by JOB_OPEN_DAYS from now.
 */
export async function reopenJob(jobId: string, actorId: string) {
  return db.$transaction(async (tx) => {
    const job = await tx.job.findUnique({
      where: { id: jobId },
      include: { capState: true },
    });
    if (!job || !job.capState) {
      throw new DomainError("Job has never been published", "NOT_PUBLISHED");
    }
    if (job.status !== "PAUSED" && !job.capState.isPaused) {
      throw new DomainError("Job is not paused", "NOT_PAUSED");
    }

    const updated = await tx.job.update({
      where: { id: jobId },
      data: {
        status: "OPEN",
        maxApplications: job.maxApplications + REOPEN_EXTRA_SLOTS,
        closesAt: addDays(new Date(), JOB_OPEN_DAYS),
      },
    });
    await tx.jobCapState.update({
      where: { jobId },
      data: {
        isPaused: false,
        pausedAt: null,
        reopenedAt: new Date(),
        reopenCount: { increment: 1 },
      },
    });
    await audit(
      {
        actorId,
        action: "job.reopen",
        targetType: "Job",
        targetId: jobId,
        metadata: { newMax: job.maxApplications + REOPEN_EXTRA_SLOTS },
      },
      tx
    );
    return updated;
  });
}

/**
 * Cron entrypoint: pause OPEN jobs whose application window has elapsed.
 * Idempotent — safe to run every hour.
 */
export async function pauseExpiredJobs(): Promise<number> {
  const now = new Date();
  const expired = await db.job.findMany({
    where: { status: "OPEN", closesAt: { lt: now } },
    select: { id: true },
  });

  for (const { id } of expired) {
    await db.$transaction(async (tx) => {
      await tx.job.update({ where: { id }, data: { status: "PAUSED" } });
      await tx.jobCapState.update({
        where: { jobId: id },
        data: { isPaused: true, pausedAt: now },
      });
      await audit(
        {
          action: "job.pause",
          targetType: "Job",
          targetId: id,
          metadata: { reason: "window_elapsed" },
        },
        tx
      );
    });
  }
  return expired.length;
}
