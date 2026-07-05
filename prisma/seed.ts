/**
 * Dev seed: 3 companies, 10 published jobs. Idempotent — safe to re-run.
 * Usage: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { addDays } from "date-fns";

const db = new PrismaClient();

const companies = [
  {
    slug: "orbitdesk",
    name: "OrbitDesk",
    website: "https://orbitdesk.example.com",
    description:
      "Mission control for customer support teams. Seed stage, 6 people, remote-first.",
  },
  {
    slug: "ferrite-labs",
    name: "Ferrite Labs",
    website: "https://ferrite.example.com",
    description:
      "Developer tools for embedded Rust. Series A, 18 people, NYC + remote.",
  },
  {
    slug: "quiethire",
    name: "QuietHire",
    website: "https://quiethire.example.com",
    description:
      "Payroll and compliance for fractional workforces. Bootstrapped and profitable.",
  },
];

const jobs: {
  companySlug: string;
  title: string;
  locationType: "REMOTE" | "HYBRID" | "ONSITE";
  location?: string;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
}[] = [
  { companySlug: "orbitdesk", title: "Founding Full-Stack Engineer", locationType: "REMOTE", salaryMin: 140000, salaryMax: 190000 },
  { companySlug: "orbitdesk", title: "Product Designer", locationType: "REMOTE", salaryMin: 120000, salaryMax: 160000 },
  { companySlug: "orbitdesk", title: "Developer Advocate", locationType: "REMOTE", salaryMin: 110000, salaryMax: 150000 },
  { companySlug: "ferrite-labs", title: "Senior Systems Engineer (Rust)", locationType: "HYBRID", location: "New York, NY", salaryMin: 170000, salaryMax: 220000 },
  { companySlug: "ferrite-labs", title: "Compiler Engineer", locationType: "REMOTE", salaryMin: 160000, salaryMax: 210000 },
  { companySlug: "ferrite-labs", title: "Technical Writer", locationType: "REMOTE", salaryMin: 90000, salaryMax: 120000 },
  { companySlug: "ferrite-labs", title: "Engineering Intern", locationType: "ONSITE", location: "New York, NY", employmentType: "Internship", salaryMin: 50000, salaryMax: 60000 },
  { companySlug: "quiethire", title: "First Sales Hire (AE)", locationType: "REMOTE", salaryMin: 90000, salaryMax: 130000 },
  { companySlug: "quiethire", title: "Backend Engineer (Payments)", locationType: "REMOTE", salaryMin: 150000, salaryMax: 185000 },
  { companySlug: "quiethire", title: "Operations Generalist", locationType: "HYBRID", location: "Austin, TX", salaryMin: 80000, salaryMax: 110000 },
];

function jobDescription(title: string, company: string): string {
  return [
    `${company} is hiring a ${title}.`,
    "",
    "What you'll do:",
    "- Ship meaningful work in your first week",
    "- Own a core part of the product end to end",
    "- Work directly with the founders and early customers",
    "",
    "What we're looking for:",
    "- Bias to action and comfort with ambiguity",
    "- Strong written communication (we're async-heavy)",
    "- You actually want to work here — tell us why in your application",
    "",
    "Why this posting is different: we're on Limited, so we cap applications at 50. ",
    "Every applicant gets a real review. If you apply, you'll hear back.",
  ].join("\n");
}

async function main() {
  for (const c of companies) {
    await db.company.upsert({
      where: { slug: c.slug },
      create: c,
      update: {},
    });
  }

  const now = new Date();
  for (const j of jobs) {
    const company = await db.company.findUniqueOrThrow({
      where: { slug: j.companySlug },
    });
    const existing = await db.job.findFirst({
      where: { companyId: company.id, title: j.title },
    });
    if (existing) continue;

    const job = await db.job.create({
      data: {
        companyId: company.id,
        title: j.title,
        description: jobDescription(j.title, company.name),
        status: "OPEN",
        locationType: j.locationType,
        location: j.location ?? null,
        employmentType: j.employmentType ?? "Full-time",
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        publishedAt: now,
        closesAt: addDays(now, 7),
      },
    });
    await db.jobCapState.create({ data: { jobId: job.id } });
  }

  console.log(
    `Seeded ${companies.length} companies and up to ${jobs.length} jobs.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
