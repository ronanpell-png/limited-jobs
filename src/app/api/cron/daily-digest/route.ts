import { NextResponse } from "next/server";
import { sendDailyDigests } from "@/lib/digest";

/**
 * Daily cron: email seekers the new roles matching their skills.
 * Protected by CRON_SECRET bearer token — rejects everything else.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { sent } = await sendDailyDigests();
  return NextResponse.json({ ok: true, sent });
}

// Vercel Cron sends GET requests.
export const GET = POST;
