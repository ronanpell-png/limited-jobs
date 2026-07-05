import { randomUUID } from "node:crypto";
import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { JOB_OPEN_DAYS } from "@/lib/config";

let counter = 0;
function uid(): string {
  return `${Date.now()}-${counter++}`;
}

export async function createSeeker() {
  const id = uid();
  return db.user.create({
    data: {
      clerkId: `clerk_seeker_${id}`,
      email: `seeker-${id}@test.dev`,
      role: "SEEKER",
      seekerProfile: {
        create: { headline: "Test seeker", skills: ["testing"] },
      },
    },
  });
}

export async function createEmployerWithCompany() {
  const id = uid();
  const user = await db.user.create({
    data: {
      clerkId: `clerk_employer_${id}`,
      email: `employer-${id}@test.dev`,
      role: "EMPLOYER",
    },
  });
  const company = await db.company.create({
    data: {
      name: `TestCo ${id}`,
      slug: `testco-${id}`,
      members: { create: { userId: user.id } },
    },
  });
  return { user, company };
}

export async function createOpenJob(
  companyId: string,
  opts: { maxApplications?: number } = {}
) {
  const now = new Date();
  const job = await db.job.create({
    data: {
      companyId,
      title: `Test role ${uid()}`,
      description: "A test role with a sufficiently long description for validation purposes.",
      status: "OPEN",
      maxApplications: opts.maxApplications ?? 50,
      publishedAt: now,
      closesAt: addDays(now, JOB_OPEN_DAYS),
    },
  });
  await db.jobCapState.create({ data: { jobId: job.id } });
  return job;
}

export function intent(seed: string): string {
  return `I want to join because your product genuinely solves problem ${seed} and I have relevant experience shipping similar systems end to end.`;
}

export function idem(): string {
  return randomUUID();
}
