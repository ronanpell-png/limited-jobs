import Link from "next/link";
import { redirect } from "next/navigation";
import { differenceInDays, formatDistanceToNow } from "date-fns";
import { db } from "@/lib/db";
import { currentDbUser } from "@/lib/auth/session";
import { getBudgetHistory, getRemainingBudget } from "@/lib/applications/budget";
import { REFUND_ELIGIBLE_DAYS } from "@/lib/config";
import { BudgetMeter } from "@/components/shared/BudgetMeter";
import { CapBadge } from "@/components/shared/CapBadge";
import { StatusChip } from "@/components/shared/StatusChip";
import { WithdrawButton } from "@/components/seeker/WithdrawButton";

export const metadata = { title: "Dashboard — Limited" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentDbUser();
  if (!user) redirect("/sign-in");
  if (user.role === "EMPLOYER") redirect("/employer/jobs");
  if (user.role === "ADMIN") redirect("/admin");

  const profile = await db.seekerProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) redirect("/onboarding");

  const [budget, history, applications, savedJobs] = await Promise.all([
    getRemainingBudget(user.id),
    getBudgetHistory(user.id),
    db.application.findMany({
      where: { seekerId: user.id },
      include: { job: { include: { company: true } } },
      orderBy: { submittedAt: "desc" },
    }),
    db.savedJob.findMany({
      where: { seekerId: user.id },
      include: {
        job: { include: { company: true, capState: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const counts = {
    sent: applications.filter((a) => a.status !== "WITHDRAWN").length,
    viewed: applications.filter(
      (a) => a.status === "VIEWED" || a.status === "SHORTLISTED" || a.status === "HIRED"
    ).length,
    shortlisted: applications.filter(
      (a) => a.status === "SHORTLISTED" || a.status === "HIRED"
    ).length,
    hired: applications.filter((a) => a.status === "HIRED").length,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My applications</h1>
          <p className="mt-1 text-sm text-stone-600">
            {profile.headline} ·{" "}
            <Link href="/onboarding" className="text-indigo-600 hover:underline">
              Edit profile
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <BudgetMeter budget={budget} />
          <Link
            href="/jobs"
            className="mt-4 block rounded-md bg-indigo-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700"
          >
            Browse open roles
          </Link>

          {history.length > 0 && (
            <div className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
              <h2 className="text-sm font-medium text-stone-700">
                Budget activity
              </h2>
              <ul className="mt-3 space-y-2.5">
                {history.map((entry) => {
                  const freesInFuture =
                    entry.freesAt && entry.freesAt > new Date();
                  return (
                    <li key={entry.id} className="text-xs">
                      <div className="flex items-start gap-2">
                        <span
                          className={`shrink-0 font-semibold tabular-nums ${
                            entry.delta < 0
                              ? "text-stone-500"
                              : "text-emerald-600"
                          }`}
                        >
                          {entry.delta < 0 ? "−1" : "+1"}
                        </span>
                        <span className="min-w-0 text-stone-600">
                          {entry.delta < 0 ? "Applied" : "Refund"}
                          {entry.jobTitle && entry.jobId ? (
                            <>
                              {" — "}
                              <Link
                                href={`/jobs/${entry.jobId}`}
                                className="hover:text-indigo-600"
                              >
                                {entry.jobTitle}
                              </Link>
                            </>
                          ) : null}
                          <span className="block text-stone-400">
                            {formatDistanceToNow(entry.createdAt, {
                              addSuffix: true,
                            })}
                            {freesInFuture &&
                              ` · slot frees ${formatDistanceToNow(entry.freesAt!, { addSuffix: true })}`}
                          </span>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="md:col-span-2 space-y-3">
          {counts.sent > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
              <span>
                <strong className="text-stone-900">{counts.sent}</strong> sent
              </span>
              <span>
                <strong className="text-stone-900">{counts.viewed}</strong>{" "}
                viewed
              </span>
              <span>
                <strong className="text-stone-900">{counts.shortlisted}</strong>{" "}
                shortlisted
              </span>
              {counts.hired > 0 && (
                <span className="text-emerald-700">
                  <strong>{counts.hired}</strong> hired
                </span>
              )}
            </div>
          )}
          {applications.length === 0 && (
            <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
              No applications yet. You have {budget.remaining} ready to spend —
              make them count.
            </div>
          )}
          {applications.map((app) => {
            const ageDays = differenceInDays(new Date(), app.submittedAt);
            const refundEligible =
              app.status === "SUBMITTED" &&
              !app.respondedAt &&
              !app.budgetRefunded &&
              ageDays >= REFUND_ELIGIBLE_DAYS;
            const withdrawable =
              app.status !== "WITHDRAWN" && app.status !== "HIRED";
            return (
              <div
                key={app.id}
                className="rounded-lg border border-stone-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/jobs/${app.jobId}`}
                      className="font-medium hover:text-indigo-600"
                    >
                      {app.job.title}
                    </Link>
                    <p className="text-sm text-stone-600">
                      {app.job.company.name}
                    </p>
                  </div>
                  <StatusChip status={app.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                  <span>
                    Applied{" "}
                    {formatDistanceToNow(app.submittedAt, { addSuffix: true })}
                  </span>
                  {withdrawable && (
                    <WithdrawButton
                      applicationId={app.id}
                      refundEligible={refundEligible}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {savedJobs.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Saved jobs</h2>
          <p className="mt-1 text-sm text-stone-600">
            Your shortlist — saving is free, applying spends a credit.
          </p>
          <div className="mt-4 space-y-3">
            {savedJobs.map(({ id, job }) => {
              const applied = applications.some((a) => a.jobId === job.id);
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-medium hover:text-indigo-600"
                    >
                      {job.title}
                    </Link>
                    <p className="text-sm text-stone-600">{job.company.name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {applied ? (
                      <span className="text-xs text-stone-500">Applied</span>
                    ) : (
                      <CapBadge
                        count={job.capState?.applicationCount ?? 0}
                        max={job.maxApplications}
                        isPaused={job.capState?.isPaused ?? false}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
