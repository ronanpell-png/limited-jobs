import Link from "next/link";
import { currentDbUser } from "@/lib/auth/session";
import { getRemainingBudget } from "@/lib/applications/budget";

/**
 * Compact "5/8 left" pill in the nav so the budget is visible while
 * browsing — the constraint should be present at the moment of choice.
 * Renders nothing for signed-out users, employers, and admins.
 */
export async function NavBudgetPill() {
  const user = await currentDbUser();
  if (!user || user.role !== "SEEKER") return null;

  const budget = await getRemainingBudget(user.id);
  const tone =
    budget.remaining === 0
      ? "bg-red-50 text-red-700 border-red-200"
      : budget.remaining <= 2
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-indigo-50 text-indigo-700 border-indigo-200";

  return (
    <Link
      href="/dashboard"
      title="Your weekly application budget"
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition hover:opacity-80 ${tone}`}
    >
      {budget.remaining}/{budget.limit}
      <span className="hidden font-normal sm:inline">left this week</span>
    </Link>
  );
}
