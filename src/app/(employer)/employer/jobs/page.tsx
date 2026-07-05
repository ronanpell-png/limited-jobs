import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { db } from "@/lib/db";
import { currentDbUser } from "@/lib/auth/session";
import { CapBadge } from "@/components/shared/CapBadge";

export const metadata = { title: "Your jobs — Limited" };
export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  PAUSED: "Paused",
  CLOSED: "Closed",
  FILLED: "Filled",
};

export default async function EmployerJobsPage() {
  const user = await currentDbUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "EMPLOYER") redirect("/dashboard");

  const membership = await db.companyMember.findFirst({
    where: { userId: user.id },
    include: { company: true },
  });
  if (!membership) redirect("/employer/onboarding");

  const jobs = await db.job.findMany({
    where: { companyId: membership.companyId },
    include: {
      capState: true,
      _count: {
        select: { applications: { where: { status: { not: "WITHDRAWN" } } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{membership.company.name}</h1>
          <p className="mt-1 text-sm text-stone-600">Your job postings</p>
        </div>
        <Link
          href="/employer/jobs/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Post a job
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {jobs.length === 0 && (
          <div className="rounded-lg border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
            No jobs yet. Post your first role — it stays open for 7 days or 50
            applicants, whichever comes first.
          </div>
        )}
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/employer/jobs/${job.id}`}
            className="block rounded-lg border border-stone-200 bg-white p-5 hover:border-indigo-300 transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{job.title}</h3>
                <p className="mt-0.5 text-xs text-stone-500">
                  {statusLabel[job.status]}
                  {job.publishedAt &&
                    ` · posted ${formatDistanceToNow(job.publishedAt, { addSuffix: true })}`}
                  {job.status === "OPEN" &&
                    job.closesAt &&
                    ` · closes ${formatDistanceToNow(job.closesAt, { addSuffix: true })}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-stone-600">
                  {job._count.applications} applicant
                  {job._count.applications === 1 ? "" : "s"}
                </span>
                <CapBadge
                  count={job.capState?.applicationCount ?? 0}
                  max={job.maxApplications}
                  isPaused={job.capState?.isPaused ?? false}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
