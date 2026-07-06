import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Employer accountability stat: the share of applications a company has
 * responded to (any status change past SUBMITTED).
 *
 * Only applications at least 3 days old count, so brand-new applicants
 * don't drag the rate down before the employer has had a chance to look.
 * Companies with fewer than MIN_SAMPLE eligible applications get no rate
 * at all — better to show nothing than a misleading 0% or 100%.
 */
const MIN_SAMPLE = 5;

export async function getCompanyResponseRates(
  companyIds: string[]
): Promise<Map<string, number>> {
  const unique = [...new Set(companyIds)];
  if (unique.length === 0) return new Map();

  const rows = await db.$queryRaw<
    { companyId: string; total: bigint; responded: bigint }[]
  >`
    SELECT j."companyId" AS "companyId",
           COUNT(*)::bigint AS total,
           COUNT(a."respondedAt")::bigint AS responded
    FROM "Application" a
    JOIN "Job" j ON j."id" = a."jobId"
    WHERE j."companyId" IN (${Prisma.join(unique)})
      AND a."status" != 'WITHDRAWN'
      AND a."submittedAt" < now() - interval '3 days'
    GROUP BY j."companyId"`;

  const rates = new Map<string, number>();
  for (const row of rows) {
    const total = Number(row.total);
    if (total >= MIN_SAMPLE) {
      rates.set(
        row.companyId,
        Math.round((Number(row.responded) / total) * 100)
      );
    }
  }
  return rates;
}

export async function getCompanyResponseRate(
  companyId: string
): Promise<number | null> {
  const rates = await getCompanyResponseRates([companyId]);
  return rates.get(companyId) ?? null;
}
