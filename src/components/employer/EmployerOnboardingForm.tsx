"use client";

import { useState, useTransition } from "react";
import { completeEmployerOnboarding } from "@/app/actions/employer";

export function EmployerOnboardingForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null);
      const res = await completeEmployerOnboarding(formData);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-stone-700">
          Company name
        </label>
        <input
          id="companyName"
          name="companyName"
          type="text"
          required
          maxLength={80}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="website" className="block text-sm font-medium text-stone-700">
          Website <span className="text-stone-400">(optional)</span>
        </label>
        <input
          id="website"
          name="website"
          type="url"
          placeholder="https://example.com"
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-stone-700">
          What does your company do?{" "}
          <span className="text-stone-400">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create company"}
      </button>
    </form>
  );
}
