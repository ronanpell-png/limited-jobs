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
  const nearCap = count >= max * 0.8;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        nearCap ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {count}/{max} spots filled
    </span>
  );
}
