"use client";

import { useState, useTransition } from "react";
import { createEmployerInvite } from "@/app/actions/admin";

export function InviteForm() {
  const [result, setResult] = useState<{
    ok: boolean;
    text: string;
    inviteUrl?: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await createEmployerInvite(formData);
      setResult(
        res.ok
          ? { ok: true, text: res.message ?? "Invite created", inviteUrl: res.inviteUrl }
          : { ok: false, text: res.error }
      );
    });
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <input
        type="email"
        name="email"
        required
        placeholder="founder@startup.com"
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
      <input
        type="text"
        name="companyName"
        placeholder="Company name (optional)"
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create invite"}
      </button>
      {result && (
        <div className={`text-sm ${result.ok ? "text-emerald-700" : "text-red-600"}`}>
          <p>{result.text}</p>
          {result.inviteUrl && (
            <code className="mt-1 block break-all rounded bg-stone-100 p-2 text-xs">
              {result.inviteUrl}
            </code>
          )}
        </div>
      )}
    </form>
  );
}
