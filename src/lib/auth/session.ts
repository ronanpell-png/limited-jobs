import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";
import type { User, UserRole } from "@prisma/client";

/**
 * Resolve the current Clerk session to our DB user.
 * Returns null when signed out or when the webhook hasn't synced yet.
 */
export async function currentDbUser(): Promise<User | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  const user = await db.user.findUnique({ where: { clerkId } });
  if (user && user.status !== "ACTIVE") return null; // suspended/banned
  return user;
}

/** Require a signed-in, active user. */
export async function requireUser(): Promise<User> {
  const user = await currentDbUser();
  if (!user) throw new ForbiddenError("You must be signed in");
  return user;
}

/** Require a specific role. Role lives in our DB — never trusted from client. */
export async function requireRole(role: UserRole): Promise<User> {
  const user = await requireUser();
  if (user.role !== role) {
    throw new ForbiddenError();
  }
  return user;
}
