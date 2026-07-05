"use client";

import { useState, useTransition } from "react";
import { updateApplicationStatus } from "@/app/actions/employer";

const ACTIONS: { status: string; label: string; style: string }[] = [
  { status: "VIEWED", label: "Mark viewed", style: "border-stone-300 text-stone-700 hover:bg-stone-50" },
  { status: "SHORTLISTED", label: "Shortlist", style: "border-emerald-300 text-emerald-700 hover:bg-emerald-50" },
  { status: "REJECTED", label: "Reject", style: "border-red-200 text-red-600 hover:bg-red-50" },
  { status: "HIRED", label: "Mark hired", style: "border-amber-300 text-amber-700 hover:bg-amber-50" },
];

export function StatusButtons({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ACTIONS.filter((a) => a.status !== currentStatus).map((a) => (
        <button
          key={a.status}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await updateApplicationStatus(applicationId, a.status);
              if (!res.ok) setError(res.error);
            })
          }
          className={`rounded-md border px-3 py-1 text-xs font-medium disabled:opacity-50 ${a.style}`}
        >
          {a.label}
        </button>
      ))}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
