"use client";

import { useState, useTransition } from "react";
import { toggleSaveJob } from "@/app/actions/seeker";

/**
 * Bookmark toggle. Optimistic: flips immediately, reverts on failure.
 * Rendered above a stretched-link card, so it stops the click from
 * navigating.
 */
export function SaveJobButton({
  jobId,
  initialSaved,
  className = "",
}: {
  jobId: string;
  initialSaved: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await toggleSaveJob(jobId);
      if (!res.ok) setSaved(!next);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={saved ? "Remove from saved jobs" : "Save job"}
      aria-pressed={saved}
      title={saved ? "Saved — click to remove" : "Save for later"}
      className={`relative z-10 rounded-md p-1.5 transition hover:bg-stone-100 ${
        saved ? "text-indigo-600" : "text-stone-400 hover:text-stone-600"
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-4.5L5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
