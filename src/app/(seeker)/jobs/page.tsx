import { db } from "@/lib/db";
import { JobCard } from "@/components/shared/JobCard";
import { jobSearchSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/request";

export const metadata = { title: "Open roles — Limited" };
export const dynamic = "force-dynamic";

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

  const jobs = await db.job.findMany({
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
  });

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

      <div className="mt-6 space-y-3">
        {jobs.length === 0 && (
          <p className="py-12 text-center text-sm text-stone-500">
            No open roles match — check back soon, new roles post weekly.
          </p>
        )}
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={{
              id: job.id,
              title: job.title,
              companyName: job.company.name,
              locationType: job.locationType,
              location: job.location,
              employmentType: job.employmentType,
              salaryMin: job.salaryMin,
              salaryMax: job.salaryMax,
              applicationCount: job.capState?.applicationCount ?? 0,
              maxApplications: job.maxApplications,
              isPaused: job.capState?.isPaused ?? false,
            }}
          />
        ))}
      </div>
    </div>
  );
}
