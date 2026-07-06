import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { sendEmail, dailyDigestEmail } from "@/lib/email";

const MAX_JOBS_PER_DIGEST = 5;
const MIN_SKILL_LENGTH = 3;

/**
 * Daily digest: email each active seeker the open roles published in the
 * last 24 hours that mention one of their profile skills. Seekers with no
 * matches (or no usable skills) get nothing — an empty digest trains
 * people to ignore the email.
 */
export async function sendDailyDigests(): Promise<{ sent: number }> {
  const since = subDays(new Date(), 1);
  const newJobs = await db.job.findMany({
    where: {
      status: "OPEN",
      publishedAt: { gte: since },
      capState: { isPaused: false },
    },
    include: { company: true },
  });
  if (newJobs.length === 0) return { sent: 0 };

  const jobText = new Map(
    newJobs.map((j) => [j.id, `${j.title} ${j.description}`.toLowerCase()])
  );

  // One query for "who already applied to these jobs" instead of per-seeker.
  const appliedRows = await db.application.findMany({
    where: { jobId: { in: newJobs.map((j) => j.id) } },
    select: { jobId: true, seekerId: true },
  });
  const appliedBySeeker = new Map<string, Set<string>>();
  for (const row of appliedRows) {
    const set = appliedBySeeker.get(row.seekerId) ?? new Set<string>();
    set.add(row.jobId);
    appliedBySeeker.set(row.seekerId, set);
  }

  const seekers = await db.user.findMany({
    where: { role: "SEEKER", status: "ACTIVE" },
    include: { seekerProfile: true },
  });

  let sent = 0;
  for (const seeker of seekers) {
    const skills = (seeker.seekerProfile?.skills ?? [])
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length >= MIN_SKILL_LENGTH);
    if (skills.length === 0) continue;

    const alreadyApplied = appliedBySeeker.get(seeker.id) ?? new Set<string>();
    const matches = newJobs
      .filter(
        (j) =>
          !alreadyApplied.has(j.id) &&
          skills.some((skill) => jobText.get(j.id)!.includes(skill))
      )
      .slice(0, MAX_JOBS_PER_DIGEST);
    if (matches.length === 0) continue;

    await sendEmail({
      to: seeker.email,
      ...dailyDigestEmail({
        jobs: matches.map((j) => ({
          id: j.id,
          title: j.title,
          companyName: j.company.name,
        })),
      }),
    });
    sent++;
  }

  return { sent };
}
