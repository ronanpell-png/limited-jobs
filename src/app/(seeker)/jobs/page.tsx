import Link from "next/link";
import { db } from "@/lib/db";
import { currentDbUser } from "@/lib/auth/session";
import { JobCard, type JobCardData } from "@/components/shared/JobCard";
import { jobSearchSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/request";
import type { Job, Company, JobCapState } from "@prisma/client";

export const metadata = { title: "Open roles — Limited" };
export const dynamic = "force-dynamic";

type JobWithRelations = Job & {
  company: Company;
  capState: JobCapState | null;
};

function toCardData(job: JobWithRelations): JobCardData {
  return {
    id: job.id,
    title: job.title,
    companyName: job.company.name,
    locationType: job.locationType,
    location: job.location,
    employmentType: job.employmentType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    description: job.description,
    publishedAt: job.publishedAt,
    applicationCount: job.capState?.applicationCount ?? 0,
    maxApplications: job.maxApplications,
    isPaused: job.capState?.isPaused ?? false,
  };
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; locationType?: string }>;
}) {
  const allowed = await checkRateLimit("jobs_list_ip", await clientIp());
  if (!allowed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-stone-600">
        Too many requests — please try again in a minute.
      </div>
    );
  }

  const raw = await searchParams;
  const parsed = jobSearchSchema.safeParse(raw);
  const { q, locationType } = parsed.success ? parsed.data : {};
  const hasFilters = Boolean(q || locationType);

  const [user, jobs] = await Promise.all([
    currentDbUser(),
    db.job.findMany({
      where: {
        status: { in: ["OPEN", "PAUSED"] },
        ...(locationType ? { locationType } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { company: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { company: true, capState: true },
      orderBy: { publishedAt: "desc" },
      take: 50,
    }),
  ]);

  const isSeeker = user?.role === "SEEKER";
  const savedIds = isSeeker
    ? new Set(
        (
          await db.savedJob.findMany({
            where: { seekerId: user!.id },
            select: { jobId: true },
          })
        ).map((s) => s.jobId)
      )
    : new Set<string>();

  const open = jobs.filter((j) => !j.capState?.isPaused && j.status === "OPEN");
  const capped = jobs.filter((j) => j.capState?.isPaused || j.status !== "OPEN");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Open roles</h1>
      <p className="mt-1 text-sm text-stone-600">
        Every role pauses at its applicant cap — apply while there&apos;s room.
      </p>

      <form className="mt-6 flex gap-2" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search roles or companies"
          className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <select
          name="locationType"
          defaultValue={locationType ?? ""}
          className="rounded-md border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="">Anywhere</option>
          <option value="REMOTE">Remote</option>
          <option value="HYBRID">Hybrid</option>
          <option value="ONSITE">Onsite</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Search
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm text-stone-500">
        <span>
          {open.length} open role{open.length === 1 ? "" : "s"}
          {hasFilters && " match"}
          {capped.length > 0 && ` · ${capped.length} recently capped`}
        </span>
        {hasFilters && (
          <Link href="/jobs" className="text-indigo-600 hover:underline">
            Clear filters
          </Link>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {open.length === 0 && (
          <p className="py-12 text-center text-sm text-stone-500">
            No open roles match — check back soon, new roles post weekly.
          </p>
        )}
        {open.map((job) => (
          <JobCard
            key={job.id}
            job={toCardData(job)}
            showSaveButton={isSeeker}
            initialSaved={savedIds.has(job.id)}
          />
        ))}
      </div>

      {capped.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
            Recently capped
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            These roles hit their applicant limit. Save one and check back —
            employers can reopen with one click.
          </p>
          <div className="mt-3 space-y-3">
            {capped.map((job) => (
              <JobCard
                key={job.id}
                job={toCardData(job)}
                showSaveButton={isSeeker}
                initialSaved={savedIds.has(job.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
