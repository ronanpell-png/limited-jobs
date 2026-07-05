import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { requireResumeAccess } from "@/lib/auth/guards";
import { readResumeFile } from "@/lib/security/resume-storage";
import { DomainError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";

/**
 * Authorized resume download. Access requires:
 *  - being the resume owner, OR
 *  - being an employer who received an application from the owner.
 * Resumes are never publicly reachable.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  try {
    const requester = await requireUser();

    const profile = await db.seekerProfile.findFirst({
      where: { resumeKey: key },
      select: { userId: true },
    });
    if (!profile) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    await requireResumeAccess(profile.userId, requester.id);

    const file = await readResumeFile(key);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="resume.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof DomainError && err.code === "FORBIDDEN") {
      await audit({
        action: "security.forbidden",
        targetType: "Resume",
        targetId: key,
      });
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
