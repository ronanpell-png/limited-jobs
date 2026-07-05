import Link from "next/link";
import { redirect } from "next/navigation";
import { differenceInDays, formatDistanceToNow } from "date-fns";
import { db } from "@/lib/db";
import { currentDbUser } from "@/lib/auth/session";
import { getRemainingBudget } from "@/lib/applications/budget";
import { REFUND_ELIGIBLE_DAYS } from "@/lib/config";
import { BudgetMeter } from "@/components/shared/BudgetMeter";
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

  const [budget, applications] = await Promise.all([
    getRemainingBudget(user.id),
    db.application.findMany({
      where: { seekerId: user.id },
      include: { job: { include: { company: true } } },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

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
        </div>

        <div className="md:col-span-2 space-y-3">
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
    </div>
  );
}
