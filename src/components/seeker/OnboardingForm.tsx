"use client";

import { useState, useTransition } from "react";
import { completeSeekerOnboarding } from "@/app/actions/seeker";

export function OnboardingForm({
  initial,
}: {
  initial: {
    headline: string;
    bio: string;
    skills: string;
    hasResume: boolean;
  } | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null);
      const res = await completeSeekerOnboarding(formData);
      // Success redirects server-side; only errors return here.
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="headline" className="block text-sm font-medium text-stone-700">
          Headline
        </label>
        <input
          id="headline"
          name="headline"
          type="text"
          required
          maxLength={120}
          defaultValue={initial?.headline ?? ""}
          placeholder="e.g. Full-stack engineer, 4 years, React + Go"
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="skills" className="block text-sm font-medium text-stone-700">
          Skills <span className="text-stone-400">(comma-separated)</span>
        </label>
        <input
          id="skills"
          name="skills"
          type="text"
          defaultValue={initial?.skills ?? ""}
          placeholder="TypeScript, PostgreSQL, product thinking"
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-stone-700">
          About you <span className="text-stone-400">(optional)</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={2000}
          defaultValue={initial?.bio ?? ""}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="resume" className="block text-sm font-medium text-stone-700">
          Resume{" "}
          <span className="text-stone-400">
            (PDF, max 5MB{initial?.hasResume ? " — replaces current" : ""})
          </span>
        </label>
        <input
          id="resume"
          name="resume"
          type="file"
          accept="application/pdf"
          className="mt-1 block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-stone-200"
        />
        {initial?.hasResume && (
          <p className="mt-1 text-xs text-emerald-600">Resume on file ✓</p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
