export const metadata = { title: "Privacy Policy — Limited" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 prose prose-stone">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-4 text-sm text-stone-500">Last updated: July 2026</p>

      <div className="mt-8 space-y-6 text-stone-700">
        <section>
          <h2 className="text-xl font-semibold">What we collect</h2>
          <p className="mt-2">
            Your email address, profile information (headline, skills, bio),
            your resume, and the applications you submit (including intent
            statements). Employers we work with provide company and job
            information.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">How your data is used</h2>
          <p className="mt-2">
            Your resume and application details are shared only with employers
            you apply to. Your resume is stored privately and is never publicly
            accessible or searchable.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">What we never do</h2>
          <p className="mt-2">
            We do not sell your data. We do not share your profile with
            employers you have not applied to. We do not use your data for
            advertising.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Deletion</h2>
          <p className="mt-2">
            Email us to delete your account. Deletion removes your profile,
            resume, and applications. During beta this is a manual process
            completed within 30 days.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Emails</h2>
          <p className="mt-2">
            We send transactional emails about your applications. Every email
            includes an unsubscribe option for non-essential notifications.
          </p>
        </section>
      </div>
    </div>
  );
}
