"use client";

import { useState, useTransition } from "react";
import { withdrawMyApplication } from "@/app/actions/seeker";

export function WithdrawButton({
  applicationId,
  refundEligible,
}: {
  applicationId: string;
  refundEligible: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-stone-500 hover:text-red-600 underline"
      >
        Withdraw
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className="text-stone-600">
        {refundEligible ? "Withdraw and refund 1 credit?" : "Withdraw? No refund yet."}
      </span>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await withdrawMyApplication(applicationId);
            if (!res.ok) setError(res.error);
          })
        }
        className="rounded bg-red-600 px-2 py-0.5 text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "…" : "Yes"}
      </button>
      <button onClick={() => setConfirming(false)} className="text-stone-500 underline">
        No
      </button>
      {error && <span className="text-red-600">{error}</span>}
    </span>
  );
}
