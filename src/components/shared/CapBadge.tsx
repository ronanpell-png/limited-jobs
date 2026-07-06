/**
 * Applicant-cap badge with escalating urgency:
 *   < 50% full  — quiet gray (no urgency, don't compete with the title)
 *   50–79%      — indigo ("filling up")
 *   >= 80%      — amber ("almost full")
 *   paused      — stone ("limit reached")
 */
export function CapBadge({
  count,
  max,
  isPaused,
}: {
  count: number;
  max: number;
  isPaused: boolean;
}) {
  if (isPaused) {
    return (
      <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
        Applicant limit reached
      </span>
    );
  }

  const ratio = max > 0 ? count / max : 0;
  const style =
    ratio >= 0.8
      ? "bg-amber-50 text-amber-700"
      : ratio >= 0.5
        ? "bg-indigo-50 text-indigo-700"
        : "bg-stone-50 text-stone-500";
  const label =
    ratio >= 0.8
      ? `${max - count} spot${max - count === 1 ? "" : "s"} left`
      : `${count}/${max} spots filled`;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}
