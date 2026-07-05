"use client";

import { useMemo, useState, useTransition } from "react";
import { applyToJob } from "@/app/actions/seeker";
import { INTENT_MAX_LENGTH, INTENT_MIN_LENGTH } from "@/lib/config";

export function ApplyForm({
  jobId,
  companyName,
  remaining,
}: {
  jobId: string;
  companyName: string;
  remaining: number;
}) {
  // Stable per-mount idempotency key: double-clicks and retries are replay-safe.
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const [intent, setIntent] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submitted = result?.ok === true;

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await applyToJob(formData);
      setResult(
        res.ok
          ? { ok: true, text: res.message ?? "Application sent" }
          : { ok: false, text: res.error }
      );
    });
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        {result!.text}. You have {Math.max(0, remaining - 1)} of your weekly
        applications left.
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {/* Honeypot — hidden from real users, tempting to bots */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label
          htmlFor="intentStatement"
          className="block text-sm font-medium text-stone-700"
        >
          Why do you want to work at {companyName}?
        </label>
        <textarea
          id="intentStatement"
          name="intentStatement"
          rows={4}
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          minLength={INTENT_MIN_LENGTH}
          maxLength={INTENT_MAX_LENGTH}
          required
          placeholder="Be specific — the hiring team reads every one of these."
          className="mt-1 w-full rounded-md border border-stone-300 p-3 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-stone-500">
          {intent.length}/{INTENT_MAX_LENGTH} characters (minimum{" "}
          {INTENT_MIN_LENGTH})
        </p>
      </div>

      {result && !result.ok && (
        <p className="text-sm text-red-600">{result.text}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || intent.trim().length < INTENT_MIN_LENGTH}
          className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Spend 1 application"}
        </button>
        <span className="text-xs text-stone-500">
          {remaining} of your weekly budget left
        </span>
      </div>
    </form>
  );
}
