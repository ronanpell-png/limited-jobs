import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { RESUME_MAX_BYTES } from "@/lib/config";
import { ValidationError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";

/**
 * Private resume storage. Files live outside the public web root
 * (storage/resumes/, gitignored) and are only served through the
 * authorization-checked /api/resumes/[key] route.
 *
 * Swap `saveResumeFile`/`readResumeFile` internals for Supabase Storage or
 * Uploadthing in production — the interface stays the same.
 */

const STORAGE_DIR = path.join(process.cwd(), "storage", "resumes");

function assertPdf(buffer: Buffer): void {
  if (buffer.byteLength === 0) throw new ValidationError("Empty file");
  if (buffer.byteLength > RESUME_MAX_BYTES) {
    throw new ValidationError("Resume must be 5 MB or smaller");
  }
  // Magic bytes check — extension alone is not trusted.
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new ValidationError("Resume must be a PDF file");
  }
}

/**
 * Validate, hash, and persist a resume. Returns the storage key and hash.
 * Flags cross-account duplicate resumes for admin review.
 */
export async function saveResume(
  userId: string,
  buffer: Buffer
): Promise<{ key: string; hash: string }> {
  assertPdf(buffer);

  const hash = createHash("sha256").update(buffer).digest("hex");
  // UUID key — user-supplied filenames never touch the filesystem.
  const key = `${randomUUID()}.pdf`;

  await mkdir(STORAGE_DIR, { recursive: true });
  await writeFile(path.join(STORAGE_DIR, key), buffer);

  // Multi-account abuse signal: same resume bytes on a different account.
  const duplicate = await db.seekerProfile.findFirst({
    where: { resumeHash: hash, userId: { not: userId } },
    select: { userId: true },
  });
  if (duplicate) {
    await audit({
      actorId: userId,
      action: "resume.dedup_flag",
      targetType: "User",
      targetId: userId,
      metadata: { matchesUserId: duplicate.userId },
    });
  }

  await audit({
    actorId: userId,
    action: "resume.upload",
    targetType: "User",
    targetId: userId,
  });

  return { key, hash };
}

/** Read resume bytes by storage key. Caller must have passed an IDOR guard. */
export async function readResumeFile(key: string): Promise<Buffer> {
  // Defense-in-depth against path traversal even though keys are UUIDs.
  const safe = path.basename(key);
  if (safe !== key || !/^[0-9a-f-]{36}\.pdf$/.test(key)) {
    throw new ValidationError("Invalid resume key");
  }
  return readFile(path.join(STORAGE_DIR, safe));
}
