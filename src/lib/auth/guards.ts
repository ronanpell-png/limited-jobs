import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

/**
 * IDOR guards: every sensitive resource access goes through one of these.
 * They throw NotFound/Forbidden rather than returning partial data.
 */

/** The employer (userId) must be a member of the company that owns the job. */
export async function requireJobOwner(jobId: string, userId: string) {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { company: { include: { members: true } }, capState: true },
  });
  if (!job) throw new NotFoundError("Job not found");
  const isMember = job.company.members.some((m) => m.userId === userId);
  if (!isMember) throw new ForbiddenError();
  return job;
}

/**
 * An application may be accessed by the seeker who submitted it, or any
 * member of the company that owns the job.
 */
export async function requireApplicationAccess(
  applicationId: string,
  userId: string
) {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      job: { include: { company: { include: { members: true } } } },
      seeker: { include: { seekerProfile: true } },
    },
  });
  if (!application) throw new NotFoundError("Application not found");
  const isSeeker = application.seekerId === userId;
  const isEmployer = application.job.company.members.some(
    (m) => m.userId === userId
  );
  if (!isSeeker && !isEmployer) throw new ForbiddenError();
  return { application, isSeeker, isEmployer };
}

/**
 * A resume may be downloaded by its owner, or by an employer who has
 * received an application from that seeker.
 */
export async function requireResumeAccess(
  ownerUserId: string,
  requesterUserId: string
) {
  if (ownerUserId === requesterUserId) return;
  const received = await db.application.findFirst({
    where: {
      seekerId: ownerUserId,
      status: { not: "WITHDRAWN" },
      job: { company: { members: { some: { userId: requesterUserId } } } },
    },
    select: { id: true },
  });
  if (!received) throw new ForbiddenError();
}
