import { NextResponse } from "next/server";
import { pauseExpiredJobs } from "@/lib/jobs/cap";

/**
 * Hourly cron: pause OPEN jobs whose 7-day window has elapsed.
 * Protected by CRON_SECRET bearer token — rejects everything else.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const paused = await pauseExpiredJobs();
  return NextResponse.json({ ok: true, paused });
}

// Vercel Cron sends GET requests.
export const GET = POST;
