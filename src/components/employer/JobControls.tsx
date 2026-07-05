"use client";

import { useState, useTransition } from "react";
import { closeMyJob, reopenMyJob } from "@/app/actions/employer";
import { REOPEN_EXTRA_SLOTS, JOB_OPEN_DAYS } from "@/lib/config";

export function JobControls({
  jobId,
  status,
}: {
  jobId: string;
  status: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {status === "PAUSED" && (
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await reopenMyJob(jobId);
                setMessage(res.ok ? (res.message ?? null) : res.error);
              })
            }
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Reopen (+{REOPEN_EXTRA_SLOTS} slots, {JOB_OPEN_DAYS} more days)
          </button>
        )}
        {status !== "CLOSED" && (
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await closeMyJob(jobId);
                setMessage(res.ok ? (res.message ?? null) : res.error);
              })
            }
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Close job
          </button>
        )}
      </div>
      {status === "PAUSED" && (
        <p className="text-xs text-stone-500 max-w-md">
          Research on applicant caps: most employers who reviewed their first
          50 applicants made a hire without needing more. Reopen only if none
          of your current applicants fit.
        </p>
      )}
      {message && <p className="text-xs text-stone-600">{message}</p>}
    </div>
  );
}
