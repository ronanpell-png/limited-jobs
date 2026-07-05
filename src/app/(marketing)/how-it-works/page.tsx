import Link from "next/link";
import {
  BUDGET_LIMIT,
  BUDGET_WINDOW_DAYS,
  DEFAULT_MAX_APPLICATIONS,
  JOB_OPEN_DAYS,
  REFUND_ELIGIBLE_DAYS,
} from "@/lib/config";

export const metadata = { title: "How it works — Limited" };

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 space-y-12">
      <div>
        <h1 className="text-3xl font-bold">How the limits work</h1>
        <p className="mt-3 text-stone-600">
          Applying to jobs online became free, so everyone applies to
          everything — and nobody gets read. We put scarcity back in, on both
          sides.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-semibold">For job seekers</h2>
        <ul className="mt-4 space-y-3 text-stone-700">
          <li>
            <strong>{BUDGET_LIMIT} applications per rolling{" "}
            {BUDGET_WINDOW_DAYS} days.</strong> Your budget refills
            continuously — each application you send frees back up{" "}
            {BUDGET_WINDOW_DAYS} days later.
          </li>
          <li>
            <strong>Every application needs an intent statement.</strong> A few
            sentences on why this company. Copy-paste is rejected.
          </li>
          <li>
            <strong>Ghosted? Get your credit back.</strong> Withdraw an
            application that got no response after {REFUND_ELIGIBLE_DAYS} days
            and we refund the credit.
          </li>
          <li>
            <strong>No pay-to-apply-more. Ever.</strong> The limit is the
            product, not a paywall.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">For employers</h2>
        <ul className="mt-4 space-y-3 text-stone-700">
          <li>
            <strong>
              Jobs pause at {DEFAULT_MAX_APPLICATIONS} applicants or{" "}
              {JOB_OPEN_DAYS} days
            </strong>{" "}
            — whichever comes first. Field experiments show hiring outcomes
            don&apos;t improve past that point; the pile just grows.
          </li>
          <li>
            <strong>Reopen with one click.</strong> Need more candidates? One
            click adds more capacity. Most employers never need to.
          </li>
          <li>
            <strong>Every applicant chose you.</strong> Candidates spend 1 of
            only {BUDGET_LIMIT} weekly applications to reach you, and tell you
            why.
          </li>
        </ul>
      </section>

      <section className="rounded-lg bg-indigo-50 border border-indigo-100 p-6">
        <h2 className="text-lg font-semibold">Why this works</h2>
        <p className="mt-2 text-sm text-stone-700">
          In a large field experiment on an online labor market (Horton &amp;
          Vasserman, 2021), capping jobs at 50 applicants reduced application
          volume 11% with <em>no drop in hiring or match quality</em> — and
          applicants to capped jobs were 17% more likely to be hired. Scarcity
          doesn&apos;t hurt matching. It removes the waste.
        </p>
      </section>

      <div className="text-center">
        <Link
          href="/sign-up"
          className="inline-block rounded-md bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700"
        >
          Start applying intentionally
        </Link>
      </div>
    </div>
  );
}
