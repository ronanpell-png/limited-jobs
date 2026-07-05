import { describe, expect, it } from "vitest";
import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { submitApplication, withdrawApplication } from "@/lib/applications/submit";
import { getRemainingBudget } from "@/lib/applications/budget";
import { reopenJob, pauseExpiredJobs } from "@/lib/jobs/cap";
import { BUDGET_LIMIT, REOPEN_EXTRA_SLOTS } from "@/lib/config";
import {
  DuplicateApplicationError,
  JobPausedError,
} from "@/lib/errors";
import {
  createEmployerWithCompany,
  createOpenJob,
  createSeeker,
  idem,
  intent,
} from "./helpers";

describe("submitApplication", () => {
  it("creates the application and bumps the cap", async () => {
    const seeker = await createSeeker();
    const { company } = await createEmployerWithCompany();
    const job = await createOpenJob(company.id);

    const app = await submitApplication({
      jobId: job.id,
      seekerId: seeker.id,
      intentStatement: intent("basic"),
      idempotencyKey: idem(),
    });

    expect(app.status).toBe("SUBMITTED");
    const cap = await db.jobCapState.findUnique({ where: { jobId: job.id } });
    expect(cap?.applicationCount).toBe(1);

    const auditRows = await db.auditLog.findMany({
      where: { action: "application.submit", targetId: app.id },
    });
    expect(auditRows).toHaveLength(1);
  });

  it("is idempotent for the same idempotency key (double-click safe)", async () => {
    const seeker = await createSeeker();
    const { company } = await createEmployerWithCompany();
    const job = await createOpenJob(company.id);
    const key = idem();

    const first = await submitApplication({
      jobId: job.id,
      seekerId: seeker.id,
      intentStatement: intent("dupe-key"),
      idempotencyKey: key,
    });
    const second = await submitApplication({
      jobId: job.id,
      seekerId: seeker.id,
      intentStatement: intent("dupe-key"),
      idempotencyKey: key,
    });

    expect(second.id).toBe(first.id);
    const budget = await getRemainingBudget(seeker.id);
    expect(budget.used).toBe(1);
  });

  it("rejects a duplicate application to the same job", async () => {
    const seeker = await createSeeker();
    const { company } = await createEmployerWithCompany();
    const job = await createOpenJob(company.id);

    await submitApplication({
      jobId: job.id,
      seekerId: seeker.id,
      intentStatement: intent("first"),
      idempotencyKey: idem(),
    });
    await expect(
      submitApplication({
        jobId: job.id,
        seekerId: seeker.id,
        intentStatement: intent("second-try"),
        idempotencyKey: idem(),
      })
    ).rejects.toBeInstanceOf(DuplicateApplicationError);
  });

  it("rejects an exact-copy intent statement across jobs", async () => {
    const seeker = await createSeeker();
    const { company } = await createEmployerWithCompany();
    const jobA = await createOpenJob(company.id);
    const jobB = await createOpenJob(company.id);
    const samePitch = intent("copy-paste");

    await submitApplication({
      jobId: jobA.id,
      seekerId: seeker.id,
      intentStatement: samePitch,
      idempotencyKey: idem(),
    });
    await expect(
      submitApplication({
        jobId: jobB.id,
        seekerId: seeker.id,
        intentStatement: samePitch,
        idempotencyKey: idem(),
      })
    ).rejects.toThrow(/used this exact statement/);
  });

  it("pauses the job when the cap is reached and rejects further applies", async () => {
    const { company } = await createEmployerWithCompany();
    const job = await createOpenJob(company.id, { maxApplications: 3 });

    for (let i = 0; i < 3; i++) {
      const seeker = await createSeeker();
      await submitApplication({
        jobId: job.id,
        seekerId: seeker.id,
        intentStatement: intent(`cap-${i}`),
        idempotencyKey: idem(),
      });
    }

    const cap = await db.jobCapState.findUnique({ where: { jobId: job.id } });
    expect(cap?.isPaused).toBe(true);
    const paused = await db.job.findUnique({ where: { id: job.id } });
    expect(paused?.status).toBe("PAUSED");

    const lateSeeker = await createSeeker();
    await expect(
      submitApplication({
        jobId: job.id,
        seekerId: lateSeeker.id,
        intentStatement: intent("too-late"),
        idempotencyKey: idem(),
      })
    ).rejects.toBeInstanceOf(JobPausedError);
  });

  it("never exceeds the cap under concurrent submissions", async () => {
    const { company } = await createEmployerWithCompany();
    const job = await createOpenJob(company.id, { maxApplications: 2 });

    const seekers = await Promise.all([
      createSeeker(),
      createSeeker(),
      createSeeker(),
      createSeeker(),
    ]);
    const results = await Promise.allSettled(
      seekers.map((s, i) =>
        submitApplication({
          jobId: job.id,
          seekerId: s.id,
          intentStatement: intent(`concurrent-${i}`),
          idempotencyKey: idem(),
        })
      )
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(2);
    const cap = await db.jobCapState.findUnique({ where: { jobId: job.id } });
    expect(cap?.applicationCount).toBe(2);
    expect(cap?.isPaused).toBe(true);
  });

  it("accepts applications again after the employer reopens", async () => {
    const { user: employer, company } = await createEmployerWithCompany();
    const job = await createOpenJob(company.id, { maxApplications: 1 });

    const first = await createSeeker();
    await submitApplication({
      jobId: job.id,
      seekerId: first.id,
      intentStatement: intent("fills-cap"),
      idempotencyKey: idem(),
    });

    const reopened = await reopenJob(job.id, employer.id);
    expect(reopened.maxApplications).toBe(1 + REOPEN_EXTRA_SLOTS);
    expect(reopened.status).toBe("OPEN");

    const second = await createSeeker();
    const app = await submitApplication({
      jobId: job.id,
      seekerId: second.id,
      intentStatement: intent("after-reopen"),
      idempotencyKey: idem(),
    });
    expect(app.status).toBe("SUBMITTED");
  });
});

describe("withdrawApplication", () => {
  async function submittedApp(daysAgo: number) {
    const seeker = await createSeeker();
    const { company } = await createEmployerWithCompany();
    const job = await createOpenJob(company.id);
    const app = await submitApplication({
      jobId: job.id,
      seekerId: seeker.id,
      intentStatement: intent(`age-${daysAgo}`),
      idempotencyKey: idem(),
    });
    await db.application.update({
      where: { id: app.id },
      data: { submittedAt: subDays(new Date(), daysAgo) },
    });
    return { seeker, job, app };
  }

  it("does not refund before 14 days", async () => {
    const { seeker, app } = await submittedApp(13);
    const { refunded } = await withdrawApplication({
      applicationId: app.id,
      seekerId: seeker.id,
    });
    expect(refunded).toBe(false);
  });

  it("refunds after 14 days with no employer response", async () => {
    const { seeker, app } = await submittedApp(15);
    const { refunded } = await withdrawApplication({
      applicationId: app.id,
      seekerId: seeker.id,
    });
    expect(refunded).toBe(true);

    const updated = await db.application.findUnique({ where: { id: app.id } });
    expect(updated?.status).toBe("WITHDRAWN");
    expect(updated?.budgetRefunded).toBe(true);

    const refundEntries = await db.applicationBudgetEntry.findMany({
      where: { seekerId: seeker.id, delta: 1 },
    });
    expect(refundEntries).toHaveLength(1);
  });

  it("does not refund when the employer already responded", async () => {
    const { seeker, app } = await submittedApp(20);
    await db.application.update({
      where: { id: app.id },
      data: { status: "VIEWED", respondedAt: new Date() },
    });
    const { refunded } = await withdrawApplication({
      applicationId: app.id,
      seekerId: seeker.id,
    });
    expect(refunded).toBe(false);
  });

  it("frees a cap slot on withdrawal", async () => {
    const { app, seeker, job } = await submittedApp(1);
    await withdrawApplication({ applicationId: app.id, seekerId: seeker.id });
    const cap = await db.jobCapState.findUnique({ where: { jobId: job.id } });
    expect(cap?.applicationCount).toBe(0);
  });

  it("blocks another seeker from withdrawing someone else's application", async () => {
    const { app } = await submittedApp(1);
    const stranger = await createSeeker();
    await expect(
      withdrawApplication({ applicationId: app.id, seekerId: stranger.id })
    ).rejects.toThrow();
  });

  it("blocks re-applying after withdrawal", async () => {
    const { app, seeker, job } = await submittedApp(1);
    await withdrawApplication({ applicationId: app.id, seekerId: seeker.id });
    await expect(
      submitApplication({
        jobId: job.id,
        seekerId: seeker.id,
        intentStatement: intent("come-back"),
        idempotencyKey: idem(),
      })
    ).rejects.toBeInstanceOf(DuplicateApplicationError);
  });
});

describe("pauseExpiredJobs (cron)", () => {
  it("pauses open jobs past their close date and leaves fresh jobs alone", async () => {
    const { company } = await createEmployerWithCompany();
    const fresh = await createOpenJob(company.id);
    const stale = await createOpenJob(company.id);
    await db.job.update({
      where: { id: stale.id },
      data: { closesAt: subDays(new Date(), 1) },
    });

    const paused = await pauseExpiredJobs();
    expect(paused).toBe(1);

    const staleAfter = await db.job.findUnique({ where: { id: stale.id } });
    const freshAfter = await db.job.findUnique({ where: { id: fresh.id } });
    expect(staleAfter?.status).toBe("PAUSED");
    expect(freshAfter?.status).toBe("OPEN");
  });
});

describe("budget + cap interplay", () => {
  it("a seeker can spend their full budget across distinct jobs only", async () => {
    const seeker = await createSeeker();
    const { company } = await createEmployerWithCompany();
    const jobs = await Promise.all(
      Array.from({ length: BUDGET_LIMIT }, () => createOpenJob(company.id))
    );
    for (const [i, job] of jobs.entries()) {
      await submitApplication({
        jobId: job.id,
        seekerId: seeker.id,
        intentStatement: intent(`full-${i}`),
        idempotencyKey: idem(),
      });
    }
    const budget = await getRemainingBudget(seeker.id);
    expect(budget.remaining).toBe(0);
    expect(budget.used).toBe(BUDGET_LIMIT);
  });
});
