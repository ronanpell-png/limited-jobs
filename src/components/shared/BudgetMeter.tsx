import { formatDistanceToNow } from "date-fns";
import type { BudgetSnapshot } from "@/lib/applications/budget";

export function BudgetMeter({ budget }: { budget: BudgetSnapshot }) {
  const pct = (budget.remaining / budget.limit) * 100;
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-stone-700">
          Applications remaining
        </span>
        <span className="text-2xl font-bold tabular-nums">
          {budget.remaining}
          <span className="text-sm font-normal text-stone-400">
            /{budget.limit}
          </span>
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-stone-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${
            budget.remaining === 0
              ? "bg-red-500"
              : budget.remaining <= 2
                ? "bg-amber-500"
                : "bg-indigo-600"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {budget.remaining === 0 && budget.nextSlotAt
          ? `Next slot frees ${formatDistanceToNow(budget.nextSlotAt, { addSuffix: true })}`
          : "Budget refills on a rolling 7-day window"}
      </p>
    </div>
  );
}
