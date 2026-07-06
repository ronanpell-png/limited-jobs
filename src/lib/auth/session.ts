import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";
import { findVerifiedEduEmail } from "@/lib/auth/edu";
import type { User, UserRole } from "@prisma/client";

/**
 * Resolve the current Clerk session to our DB user.
 *
 * Self-healing: if the Clerk session exists but no DB row does (webhook
 * not delivered yet — always the case in local dev, where Clerk cannot
 * reach localhost), sync the user on the spot. The webhook remains the
 * primary sync path in production; this is the fallback.
 */
export async function currentDbUser(): Promise<User | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  let user = await db.user.findUnique({ where: { clerkId } });
  if (!user) {
    user = await syncUserFromClerk(clerkId);
  }

  if (user && user.status !== "ACTIVE") return null; // suspended/banned
  return user;
}

async function syncUserFromClerk(clerkId: string): Promise<User | null> {
  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== clerkId) return null;

  const emails = clerkUser.emailAddresses.map((e) => ({
    email_address: e.emailAddress,
    verification: { status: e.verification?.status ?? undefined },
  }));
  const primary =
    emails.find(
      (_, i) =>
        clerkUser.emailAddresses[i].id === clerkUser.primaryEmailAddressId
    ) ?? emails[0];
  if (!primary) return null;

  const eduEmail = findVerifiedEduEmail(emails);

  // Upsert: a concurrent request or a late webhook may have created the
  // row between our findUnique and now.
  return db.user.upsert({
    where: { clerkId },
    create: {
      clerkId,
      email: primary.email_address.toLowerCase(),
      // Role defaults to SEEKER; employer/admin roles are assigned
      // server-side (invite flow / admin panel) — never from the client.
      eduVerified: Boolean(eduEmail),
      eduEmail,
    },
    update: {},
  });
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
