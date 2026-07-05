import {
  BUDGET_LIMIT,
  BUDGET_WINDOW_DAYS,
} from "@/lib/config";

export const metadata = { title: "Terms of Service — Limited" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-4 text-sm text-stone-500">Last updated: July 2026</p>

      <div className="mt-8 space-y-6 text-stone-700">
        <section>
          <h2 className="text-xl font-semibold">The deal</h2>
          <p className="mt-2">
            Limited is a job marketplace with intentional scarcity: seekers get{" "}
            {BUDGET_LIMIT} applications per rolling {BUDGET_WINDOW_DAYS} days,
            and job postings pause at their applicant cap. By using the
            platform you agree to these mechanics.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Fair use</h2>
          <p className="mt-2">
            One account per person. Automated applications, bot accounts,
            circumventing application limits, or misrepresenting your identity
            or qualifications will result in account termination.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Employers</h2>
          <p className="mt-2">
            Job postings must be for real, open positions. Ghost postings,
            data harvesting, or misuse of applicant information (including
            resumes) is prohibited and grounds for removal.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">No guarantees</h2>
          <p className="mt-2">
            We connect candidates and employers; we do not guarantee
            interviews, offers, or hires. The service is provided as-is during
            beta.
          </p>
        </section>
      </div>
    </div>
  );
}
