"use client";

import { useState, useTransition } from "react";
import { acceptEmployerInvite } from "@/app/actions/employer";

export function AcceptInviteButton({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await acceptEmployerInvite(token);
            if (res && !res.ok) setError(res.error);
          })
        }
        className="rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Accepting…" : "Accept invite"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
