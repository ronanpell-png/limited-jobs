import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CapBadge } from "@/components/shared/CapBadge";
import { SaveJobButton } from "@/components/seeker/SaveJobButton";

export type JobCardData = {
  id: string;
  title: string;
  companyName: string;
  locationType: string;
  location: string | null;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
  publishedAt: Date | null;
  applicationCount: number;
  maxApplications: number;
  isPaused: boolean;
};

function salaryLabel(min: number | null, max: number | null): string | null {
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

/** First meaningful line of the description, trimmed to ~150 chars. */
function excerpt(description: string): string {
  const text = description.replace(/\s+/g, " ").trim();
  if (text.length <= 150) return text;
  const cut = text.slice(0, 150);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export function JobCard({
  job,
  showSaveButton = false,
  initialSaved = false,
}: {
  job: JobCardData;
  /** Render the bookmark toggle (signed-in seekers only). */
  showSaveButton?: boolean;
  initialSaved?: boolean;
}) {
  const salary = salaryLabel(job.salaryMin, job.salaryMax);
  return (
    <div
      className={`relative rounded-lg border border-stone-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm ${
        job.isPaused ? "opacity-70" : ""
      }`}
    >
      {/* Stretched link: the whole card navigates, buttons sit above it. */}
      <Link
        href={`/jobs/${job.id}`}
        className="absolute inset-0"
        aria-label={`${job.title} at ${job.companyName}`}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold">{job.title}</h3>
          <p className="mt-0.5 text-sm text-stone-600">{job.companyName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CapBadge
            count={job.applicationCount}
            max={job.maxApplications}
            isPaused={job.isPaused}
          />
          {showSaveButton && (
            <SaveJobButton jobId={job.id} initialSaved={initialSaved} />
          )}
        </div>
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-stone-500">
        {excerpt(job.description)}
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
        <span>
          {job.locationType === "REMOTE"
            ? "Remote"
            : `${job.location} (${job.locationType.toLowerCase()})`}
        </span>
        <span>·</span>
        <span>{job.employmentType}</span>
        {salary && (
          <>
            <span>·</span>
            <span>{salary}</span>
          </>
        )}
        {job.publishedAt && (
          <>
            <span>·</span>
            <span>
              Posted {formatDistanceToNow(job.publishedAt, { addSuffix: true })}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
