import Link from "next/link";
import { CapBadge } from "@/components/shared/CapBadge";

export type JobCardData = {
  id: string;
  title: string;
  companyName: string;
  locationType: string;
  location: string | null;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
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

export function JobCard({ job }: { job: JobCardData }) {
  const salary = salaryLabel(job.salaryMin, job.salaryMax);
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-lg border border-stone-200 bg-white p-5 hover:border-indigo-300 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{job.title}</h3>
          <p className="mt-0.5 text-sm text-stone-600">{job.companyName}</p>
        </div>
        <CapBadge
          count={job.applicationCount}
          max={job.maxApplications}
          isPaused={job.isPaused}
        />
      </div>
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
      </div>
    </Link>
  );
}
