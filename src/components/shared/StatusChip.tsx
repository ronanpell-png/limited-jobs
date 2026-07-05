import type { ApplicationStatus } from "@prisma/client";

const styles: Record<ApplicationStatus, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700",
  VIEWED: "bg-violet-50 text-violet-700",
  SHORTLISTED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-stone-100 text-stone-600",
  WITHDRAWN: "bg-stone-100 text-stone-500",
  HIRED: "bg-amber-50 text-amber-700",
};

const labels: Record<ApplicationStatus, string> = {
  SUBMITTED: "Submitted",
  VIEWED: "Viewed",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Not selected",
  WITHDRAWN: "Withdrawn",
  HIRED: "Hired",
};

export function StatusChip({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
