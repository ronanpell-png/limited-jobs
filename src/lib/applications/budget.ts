import { addDays, subDays } from "date-fns";
import { db } from "@/lib/db";
import { BUDGET_LIMIT, BUDGET_WINDOW_DAYS } from "@/lib/config";
import { BudgetExhaustedError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";

type Client = Prisma.TransactionClient | typeof db;

export type BudgetSnapshot = {
  limit: number;
  used: number;
  remaining: number;
  /** When the next slot frees up (only set when remaining === 0). */
  nextSlotAt: Date | null;
};

/**
 * Compute a seeker's budget over the rolling window.
 *
 * Net = sum of entry deltas (-1 spends, +1 refunds) inside the window.
 * Remaining is clamped to [0, BUDGET_LIMIT] so refunds can restore slots
 * but never grant more than the base budget.
 */
export async function getRemainingBudget(
  seekerId: string,
  tx: Client = db
): Promise<BudgetSnapshot> {
  const windowStart = subDays(new Date(), BUDGET_WINDOW_DAYS);
  const entries = await tx.applicationBudgetEntry.findMany({
    where: { seekerId, createdAt: { gte: windowStart } },
    orderBy: { createdAt: "asc" },
  });

  const net = entries.reduce((sum, e) => sum + e.delta, 0);
  const remaining = Math.min(BUDGET_LIMIT, Math.max(0, BUDGET_LIMIT + net));
  const used = BUDGET_LIMIT - remaining;

  let nextSlotAt: Date | null = null;
  if (remaining === 0) {
    // The oldest spend in the window frees a slot when it rotates out.
    const oldestSpend = entries.find((e) => e.delta < 0);
    if (oldestSpend) {
      nextSlotAt = addDays(oldestSpend.createdAt, BUDGET_WINDOW_DAYS);
    }
  }

  return { limit: BUDGET_LIMIT, used, remaining, nextSlotAt };
}

export type BudgetHistoryItem = {
  id: string;
  delta: number;
  createdAt: Date;
  jobId: string | null;
  jobTitle: string | null;
  /** When this spend rotates out of the window (null for refunds / expired). */
  freesAt: Date | null;
};

/** Recent ledger entries with job context, newest first. */
export async function getBudgetHistory(
  seekerId: string,
  limit = 12
): Promise<BudgetHistoryItem[]> {
  const entries = await db.applicationBudgetEntry.findMany({
    where: { seekerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const appIds = entries
    .map((e) => e.applicationId)
    .filter((id): id is string => Boolean(id));
  const apps = appIds.length
    ? await db.application.findMany({
        where: { id: { in: appIds } },
        select: { id: true, jobId: true, job: { select: { title: true } } },
      })
    : [];
  const byId = new Map(apps.map((a) => [a.id, a]));

  const windowStart = subDays(new Date(), BUDGET_WINDOW_DAYS);
  return entries.map((e) => {
    const app = e.applicationId ? byId.get(e.applicationId) : undefined;
    return {
      id: e.id,
      delta: e.delta,
      createdAt: e.createdAt,
      jobId: app?.jobId ?? null,
      jobTitle: app?.job.title ?? null,
      freesAt:
        e.delta < 0 && e.createdAt >= windowStart
          ? addDays(e.createdAt, BUDGET_WINDOW_DAYS)
          : null,
    };
  });
}

/**
 * Spend one application credit. MUST be called inside a transaction that
 * has locked the seeker's user row (see submitApplication) — otherwise
 * concurrent requests could double-spend.
 */
export async function spendApplicationCredit(
  seekerId: string,
  applicationId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  const snapshot = await getRemainingBudget(seekerId, tx);
  if (snapshot.remaining <= 0) {
    throw new BudgetExhaustedError(undefined, snapshot.nextSlotAt ?? undefined);
  }
  await tx.applicationBudgetEntry.create({
    data: { seekerId, applicationId, delta: -1 },
  });
}

/** Refund one credit (withdrawal path). Caller enforces eligibility. */
export async function refundApplicationCredit(
  seekerId: string,
  applicationId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  await tx.applicationBudgetEntry.create({
    data: { seekerId, applicationId, delta: 1 },
  });
}
