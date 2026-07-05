import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { findVerifiedEduEmail, type ClerkEmailAddress } from "@/lib/auth/edu";

/**
 * Clerk user sync webhook. Signature-verified via Svix; svix-timestamp
 * tolerance (replay protection) is enforced by the svix library.
 */

type ClerkUserEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: ClerkEmailAddress[];
    primary_email_address_id?: string | null;
  };
};

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const body = await req.text();
  let event: ClerkUserEvent;
  try {
    event = new Webhook(secret).verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const emails = event.data.email_addresses ?? [];
    const primary =
      emails.find(
        (e) =>
          (e as { id?: string }).id === event.data.primary_email_address_id
      ) ?? emails[0];
    if (!primary) return NextResponse.json({ ok: true });

    const eduEmail = findVerifiedEduEmail(emails);

    await db.user.upsert({
      where: { clerkId: event.data.id },
      create: {
        clerkId: event.data.id,
        email: primary.email_address.toLowerCase(),
        // Role defaults to SEEKER; employer/admin roles are assigned
        // server-side (invite flow / admin panel) — never from the client.
        eduVerified: Boolean(eduEmail),
        eduEmail,
      },
      update: {
        email: primary.email_address.toLowerCase(),
        eduVerified: Boolean(eduEmail),
        eduEmail,
      },
    });
  }

  if (event.type === "user.deleted") {
    // Cascade deletes profile, applications, budget entries.
    await db.user.deleteMany({ where: { clerkId: event.data.id } });
  }

  return NextResponse.json({ ok: true });
}
