"use client";

import { useState, useTransition } from "react";
import { createJob } from "@/app/actions/employer";

export function JobPostForm() {
  const [error, setError] = useState<string | null>(null);
  const [locationType, setLocationType] = useState("REMOTE");
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null);
      const res = await createJob(formData);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-stone-700">
          Job title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={100}
          placeholder="e.g. Founding Backend Engineer"
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-stone-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={10}
          required
          minLength={50}
          maxLength={10000}
          placeholder="What the role involves, who you're looking for, how you work…"
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="locationType" className="block text-sm font-medium text-stone-700">
            Location type
          </label>
          <select
            id="locationType"
            name="locationType"
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ONSITE">Onsite</option>
          </select>
        </div>
        <div>
          <label htmlFor="employmentType" className="block text-sm font-medium text-stone-700">
            Employment type
          </label>
          <select
            id="employmentType"
            name="employmentType"
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Contract</option>
            <option>Internship</option>
          </select>
        </div>
      </div>

      {locationType !== "REMOTE" && (
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-stone-700">
            Location
          </label>
          <input
            id="location"
            name="location"
            type="text"
            required
            maxLength={100}
            placeholder="e.g. New York, NY"
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="salaryMin" className="block text-sm font-medium text-stone-700">
            Salary min <span className="text-stone-400">(USD, optional)</span>
          </label>
          <input
            id="salaryMin"
            name="salaryMin"
            type="number"
            min={0}
            step={1000}
            placeholder="120000"
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="salaryMax" className="block text-sm font-medium text-stone-700">
            Salary max <span className="text-stone-400">(USD, optional)</span>
          </label>
          <input
            id="salaryMax"
            name="salaryMax"
            type="number"
            min={0}
            step={1000}
            placeholder="180000"
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Publishing…" : "Publish job"}
      </button>
    </form>
  );
}
