import Link from "next/link";
import { BUDGET_LIMIT, DEFAULT_MAX_APPLICATIONS } from "@/lib/config";

export default function LandingPage() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-4 pt-20 pb-16 text-center">
        <p className="text-sm font-medium text-indigo-600 mb-4">
          For startups and the people who actually want to join them
        </p>
        <h1 className="text-5xl font-bold tracking-tight leading-tight">
          Every application
          <br />
          actually <span className="text-indigo-600">matters</span>.
        </h1>
        <p className="mt-6 text-lg text-stone-600 max-w-2xl mx-auto">
          You get {BUDGET_LIMIT} applications a week. That&apos;s it. No
          spray-and-pray, no thousand-applicant piles. Employers know you chose
          them — and they respond like it.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/sign-up"
            className="rounded-md bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700"
          >
            Find a job you want
          </Link>
          <Link
            href="/jobs"
            className="rounded-md border border-stone-300 px-6 py-3 font-medium hover:bg-stone-100"
          >
            Browse open roles
          </Link>
        </div>
      </section>

      <section className="bg-white border-y border-stone-200">
        <div className="mx-auto max-w-5xl px-4 py-16 grid md:grid-cols-3 gap-10">
          <div>
            <h3 className="font-semibold text-lg">
              {BUDGET_LIMIT} applications / week
            </h3>
            <p className="mt-2 text-sm text-stone-600">
              A hard budget makes each application deliberate. Career research
              shows 5&ndash;15 targeted applications beat hundreds of generic
              ones.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              Jobs cap at {DEFAULT_MAX_APPLICATIONS} applicants
            </h3>
            <p className="mt-2 text-sm text-stone-600">
              Roles pause automatically at {DEFAULT_MAX_APPLICATIONS}{" "}
              applications, so your application is never number 847 in an
              unread pile.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg">Intent, not keywords</h3>
            <p className="mt-2 text-sm text-stone-600">
              Every application includes a short statement of why you want
              this company. Employers read them — because there are few enough
              to read.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold">Hiring for a startup?</h2>
        <p className="mt-3 text-stone-600 max-w-xl mx-auto">
          Get a small pool of candidates who spent scarce applications on you —
          not 2,000 auto-generated resumes. Employer access is invite-only
          during beta.
        </p>
        <Link
          href="/how-it-works"
          className="mt-6 inline-block text-indigo-600 font-medium hover:underline"
        >
          Learn how the limits work →
        </Link>
      </section>
    </div>
  );
}
