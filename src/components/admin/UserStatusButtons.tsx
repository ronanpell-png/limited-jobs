"use client";

import { useState, useTransition } from "react";
import { setUserStatus } from "@/app/actions/admin";

export function UserStatusButtons({
  userId,
  status,
}: {
  userId: string;
  status: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set(next: "ACTIVE" | "SUSPENDED" | "BANNED") {
    startTransition(async () => {
      setError(null);
      const res = await setUserStatus(userId, next);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      {status !== "ACTIVE" && (
        <button
          disabled={pending}
          onClick={() => set("ACTIVE")}
          className="rounded border border-emerald-300 px-2 py-0.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
        >
          Reactivate
        </button>
      )}
      {status === "ACTIVE" && (
        <>
          <button
            disabled={pending}
            onClick={() => set("SUSPENDED")}
            className="rounded border border-amber-300 px-2 py-0.5 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
          >
            Suspend
          </button>
          <button
            disabled={pending}
            onClick={() => set("BANNED")}
            className="rounded border border-red-300 px-2 py-0.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Ban
          </button>
        </>
      )}
      {error && <span className="text-red-600">{error}</span>}
    </span>
  );
}
