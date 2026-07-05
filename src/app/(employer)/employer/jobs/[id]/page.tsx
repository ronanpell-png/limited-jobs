import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { currentDbUser } from "@/lib/auth/session";
import { requireJobOwner } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { CapBadge } from "@/components/shared/CapBadge";
import { StatusChip } from "@/components/shared/StatusChip";
import { JobControls } from "@/components/employer/JobControls";
import { DomainError } from "@/lib/errors";
import { showEduBadge } from "@/lib/auth/edu";

export const dynamic = "force-dynamic";

export default async function EmployerJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentDbUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "EMPLOYER") redirect("/dashboard");

  let job;
  try {
    job = await requireJobOwner(id, user.id);
  } catch (err) {
    if (err instanceof DomainError) notFound();
    throw err;
  }

  const applications = await db.application.findMany({
    where: { jobId: id, status: { not: "WITHDRAWN" } },
    include: { seeker: { include: { seekerProfile: true } } },
    orderBy: { submittedAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/employer/jobs"
        className="text-sm text-stone-500 hover:text-stone-800"
      >
        ← All jobs
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <p className="mt-1 text-sm text-stone-500">
            Status: {job.status.toLowerCase()}
            {job.closesAt &&
              job.status === "OPEN" &&
              ` · closes ${formatDistanceToNow(job.closesAt, { addSuffix: true })}`}
          </p>
        </div>
        <CapBadge
          count={job.capState?.applicationCount ?? 0}
          max={job.maxApplications}
          isPaused={job.capState?.isPaused ?? false}
        />
      </div>

      <div className="mt-4">
        <JobControls jobId={job.id} status={job.status} />
      </div>

      <h2 className="mt-10 text-lg font-semibold">
        Applicants ({applications.length})
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        Each candidate spent 1 of their 8 weekly applications on this role.
        Their &ldquo;why us&rdquo; statement is shown first for a reason.
      </p>

      <div className="mt-4 space-y-3">
        {applications.length === 0 && (
          <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
            No applicants yet.
          </div>
        )}
        {applications.map((app) => (
          <Link
            key={app.id}
            href={`/employer/jobs/${job.id}/applicants/${app.id}`}
            className="block rounded-lg border border-stone-200 bg-white p-4 hover:border-indigo-300 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-medium">
                  {app.seeker.seekerProfile?.headline ?? "Candidate"}
                </span>
                {showEduBadge(app.seeker) && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                    Verified student
                  </span>
                )}
                <p className="mt-1 text-sm text-stone-600 line-clamp-2">
                  “{app.intentStatement}”
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StatusChip status={app.status} />
                <span className="text-xs text-stone-400">
                  {formatDistanceToNow(app.submittedAt, { addSuffix: true })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
