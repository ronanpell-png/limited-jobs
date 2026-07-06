import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { db } from "@/lib/db";
import { currentDbUser } from "@/lib/auth/session";
import { getRemainingBudget } from "@/lib/applications/budget";
import { CapBadge } from "@/components/shared/CapBadge";
import { ApplyForm } from "@/components/seeker/ApplyForm";
import { SaveJobButton } from "@/components/seeker/SaveJobButton";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await db.job.findUnique({
    where: { id },
    include: { company: true, capState: true },
  });
  if (!job || job.status === "DRAFT") notFound();

  const user = await currentDbUser();
  const isSeeker = user?.role === "SEEKER";

  const existing = isSeeker
    ? await db.application.findUnique({
        where: { jobId_seekerId: { jobId: id, seekerId: user!.id } },
      })
    : null;
  const saved = isSeeker
    ? Boolean(
        await db.savedJob.findUnique({
          where: { seekerId_jobId: { seekerId: user!.id, jobId: id } },
        })
      )
    : false;
  const budget = isSeeker ? await getRemainingBudget(user!.id) : null;
  const hasProfile = isSeeker
    ? Boolean(
        await db.seekerProfile.findUnique({ where: { userId: user!.id } })
      )
    : false;

  const acceptingApplications =
    job.status === "OPEN" && job.capState && !job.capState.isPaused;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/jobs" className="text-sm text-stone-500 hover:text-stone-800">
        ← All roles
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <p className="mt-1 text-stone-600">
            {job.company.name}
            {job.company.website && (
              <>
                {" · "}
                <a
                  href={job.company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  Website
                </a>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CapBadge
            count={job.capState?.applicationCount ?? 0}
            max={job.maxApplications}
            isPaused={job.capState?.isPaused ?? false}
          />
          {isSeeker && <SaveJobButton jobId={job.id} initialSaved={saved} />}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-sm text-stone-500">
        <span>
          {job.locationType === "REMOTE"
            ? "Remote"
            : `${job.location} (${job.locationType.toLowerCase()})`}
        </span>
        <span>·</span>
        <span>{job.employmentType}</span>
        {job.closesAt && acceptingApplications && (
          <>
            <span>·</span>
            <span>
              Closes {formatDistanceToNow(job.closesAt, { addSuffix: true })}
            </span>
          </>
        )}
      </div>

      <div className="mt-8 whitespace-pre-wrap text-stone-700 leading-relaxed">
        {job.description}
      </div>

      <div className="mt-10 rounded-lg border border-stone-200 bg-white p-6">
        {!user && (
          <div className="text-center">
            <p className="text-sm text-stone-600">
              Sign in to apply. New here? Your account comes with 8
              applications per week.
            </p>
            <Link
              href="/sign-up"
              className="mt-3 inline-block rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Create account
            </Link>
          </div>
        )}

        {user && !isSeeker && (
          <p className="text-sm text-stone-600">
            Employer accounts can&apos;t apply to jobs.
          </p>
        )}

        {isSeeker && existing && (
          <p className="text-sm text-stone-600">
            You applied to this role{" "}
            {formatDistanceToNow(existing.submittedAt, { addSuffix: true })}.{" "}
            <Link href="/dashboard" className="text-indigo-600 hover:underline">
              Track it on your dashboard
            </Link>
            .
          </p>
        )}

        {isSeeker && !existing && !hasProfile && (
          <div className="text-center">
            <p className="text-sm text-stone-600">
              Finish your profile before applying — employers see it with your
              application.
            </p>
            <Link
              href="/onboarding"
              className="mt-3 inline-block rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Complete profile
            </Link>
          </div>
        )}

        {isSeeker && !existing && hasProfile && !acceptingApplications && (
          <p className="text-sm text-stone-600">
            This role has reached its applicant limit. The employer can reopen
            it — save your budget for roles accepting applications.
          </p>
        )}

        {isSeeker &&
          !existing &&
          hasProfile &&
          acceptingApplications &&
          budget &&
          (budget.remaining > 0 ? (
            <ApplyForm
              jobId={job.id}
              companyName={job.company.name}
              remaining={budget.remaining}
            />
          ) : (
            <p className="text-sm text-stone-600">
              You&apos;ve used all {budget.limit} applications this week.
              {budget.nextSlotAt &&
                ` Next slot frees ${formatDistanceToNow(budget.nextSlotAt, { addSuffix: true })}.`}
            </p>
          ))}
      </div>
    </div>
  );
}
