import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "application.submit"
  | "application.withdraw"
  | "application.status_change"
  | "application.refund"
  | "job.publish"
  | "job.pause"
  | "job.reopen"
  | "job.close"
  | "user.ban"
  | "user.suspend"
  | "user.reactivate"
  | "user.role_change"
  | "resume.upload"
  | "resume.dedup_flag"
  | "security.rate_limited"
  | "security.forbidden";

type AuditClient = Pick<Prisma.TransactionClient, "auditLog">;

/**
 * Record a sensitive action. Pass `tx` to include the write in an existing
 * transaction. Metadata must never contain resume contents or free-text PII.
 */
export async function audit(
  params: {
    actorId?: string | null;
    action: AuditAction;
    targetType: string;
    targetId: string;
    metadata?: Record<string, unknown>;
  },
  tx: AuditClient = db
): Promise<void> {
  try {
    await tx.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    // Audit logging must never take down the main request path,
    // except inside transactions where atomicity matters more.
    if (tx !== db) throw err;
    console.error("audit log write failed", err);
  }
}
