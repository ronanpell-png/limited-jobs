import { describe, expect, it } from "vitest";
import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { getRemainingBudget } from "@/lib/applications/budget";
import { submitApplication } from "@/lib/applications/submit";
import { BUDGET_LIMIT, BUDGET_WINDOW_DAYS } from "@/lib/config";
import { BudgetExhaustedError } from "@/lib/errors";
import {
  createEmployerWithCompany,
  createOpenJob,
  createSeeker,
  idem,
  intent,
} from "./helpers";

describe("application budget engine", () => {
  it("gives a fresh seeker the full budget", async () => {
    const seeker = await createSeeker();
    const budget = await getRemainingBudget(seeker.id);
    expect(budget).toMatchObject({
      limit: BUDGET_LIMIT,
      used: 0,
      remaining: BUDGET_LIMIT,
      nextSlotAt: null,
    });
  });

  it("decrements on each application and blocks the 9th", async () => {
    const seeker = await createSeeker();
    const { company } = await createEmployerWithCompany();

    for (let i = 0; i < BUDGET_LIMIT; i++) {
      const job = await createOpenJob(company.id);
      await submitApplication({
        jobId: job.id,
        seekerId: seeker.id,
        intentStatement: intent(`slot-${i}`),
        idempotencyKey: idem(),
      });
      const budget = await getRemainingBudget(seeker.id);
      expect(budget.remaining).toBe(BUDGET_LIMIT - i - 1);
    }

    const extraJob = await createOpenJob(company.id);
    await expect(
      submitApplication({
        jobId: extraJob.id,
        seekerId: seeker.id,
        intentStatement: intent("ninth"),
        idempotencyKey: idem(),
      })
    ).rejects.toBeInstanceOf(BudgetExhaustedError);

    // No application row or budget entry leaked from the failed attempt.
    const count = await db.application.count({
      where: { seekerId: seeker.id },
    });
    expect(count).toBe(BUDGET_LIMIT);
  });

  it("reports when the next slot frees up at zero budget", async () => {
    const seeker = await createSeeker();
    const { company } = await createEmployerWithCompany();

    for (let i = 0; i < BUDGET_LIMIT; i++) {
      const job = await createOpenJob(company.id);
      await submitApplication({
        jobId: job.id,
        seekerId: seeker.id,
        intentStatement: intent(`n-${i}`),
        idempotencyKey: idem(),
      });
    }

    const budget = await getRemainingBudget(seeker.id);
    expect(budget.remaining).toBe(0);
    expect(budget.nextSlotAt).toBeInstanceOf(Date);
    expect(budget.nextSlotAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it("frees slots as spends rotate out of the rolling window", async () => {
    const seeker = await createSeeker();
    // Simulate a spend just past the window boundary.
    await db.applicationBudgetEntry.create({
      data: {
        seekerId: seeker.id,
        delta: -1,
        createdAt: subDays(new Date(), BUDGET_WINDOW_DAYS + 1),
      },
    });
    const budget = await getRemainingBudget(seeker.id);
    expect(budget.remaining).toBe(BUDGET_LIMIT);
  });

  it("clamps refunds so budget never exceeds the limit", async () => {
    const seeker = await createSeeker();
    await db.applicationBudgetEntry.create({
      data: { seekerId: seeker.id, delta: 1 },
    });
    const budget = await getRemainingBudget(seeker.id);
    expect(budget.remaining).toBe(BUDGET_LIMIT);
  });

  it("is race-safe: concurrent applies never overspend", async () => {
    const seeker = await createSeeker();
    const { company } = await createEmployerWithCompany();

    // Leave exactly 1 slot.
    for (let i = 0; i < BUDGET_LIMIT - 1; i++) {
      const job = await createOpenJob(company.id);
      await submitApplication({
        jobId: job.id,
        seekerId: seeker.id,
        intentStatement: intent(`pre-${i}`),
        idempotencyKey: idem(),
      });
    }

    const jobA = await createOpenJob(company.id);
    const jobB = await createOpenJob(company.id);
    const results = await Promise.allSettled([
      submitApplication({
        jobId: jobA.id,
        seekerId: seeker.id,
        intentStatement: intent("race-a"),
        idempotencyKey: idem(),
      }),
      submitApplication({
        jobId: jobB.id,
        seekerId: seeker.id,
        intentStatement: intent("race-b"),
        idempotencyKey: idem(),
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);
    const budget = await getRemainingBudget(seeker.id);
    expect(budget.remaining).toBe(0);
  });
});
