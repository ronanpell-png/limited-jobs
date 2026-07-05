"use server";

import { randomBytes } from "node:crypto";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { audit } from "@/lib/security/audit";
import { toSafeMessage } from "@/lib/errors";
import { z } from "zod";
import type { ActionResult } from "@/app/actions/seeker";

/** Create an employer invite link (MVP: employers are invite-only). */
export async function createEmployerInvite(
  formData: FormData
): Promise<ActionResult & { inviteUrl?: string }> {
  try {
    const admin = await requireRole("ADMIN");

    const email = z
      .string()
      .email()
      .parse(String(formData.get("email") ?? "").trim().toLowerCase());
    const companyName =
      String(formData.get("companyName") ?? "").trim() || undefined;

    const token = randomBytes(32).toString("hex");
    await db.employerInvite.create({
      data: {
        email,
        token,
        companyName,
        invitedById: admin.id,
        expiresAt: addDays(new Date(), 14),
      },
    });

    revalidatePath("/admin");
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    return {
      ok: true,
      message: `Invite created for ${email}`,
      inviteUrl: `${base}/employer/invite/${token}`,
    };
  } catch (err) {
    return { ok: false, error: toSafeMessage(err) };
  }
}

/** Ban / suspend / reactivate a user. */
export async function setUserStatus(
  userId: string,
  status: "ACTIVE" | "SUSPENDED" | "BANNED"
): Promise<ActionResult> {
  try {
    const admin = await requireRole("ADMIN");
    if (userId === admin.id) {
      return { ok: false, error: "You cannot change your own status" };
    }

    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { status } });
      const action =
        status === "BANNED"
          ? "user.ban"
          : status === "SUSPENDED"
            ? "user.suspend"
            : "user.reactivate";
      await audit(
        { actorId: admin.id, action, targetType: "User", targetId: userId },
        tx
      );
    });

    revalidatePath("/admin");
    return { ok: true, message: `User ${status.toLowerCase()}` };
  } catch (err) {
    return { ok: false, error: toSafeMessage(err) };
  }
}
