import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { currentDbUser } from "@/lib/auth/session";
import { requireApplicationAccess } from "@/lib/auth/guards";
import { StatusChip } from "@/components/shared/StatusChip";
import { StatusButtons } from "@/components/employer/StatusButtons";
import { DomainError } from "@/lib/errors";
import { showEduBadge } from "@/lib/auth/edu";

export const dynamic = "force-dynamic";

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string; appId: string }>;
}) {
  const { id, appId } = await params;
  const user = await currentDbUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "EMPLOYER") redirect("/dashboard");

  let access;
  try {
    access = await requireApplicationAccess(appId, user.id);
  } catch (err) {
    if (err instanceof DomainError) notFound();
    throw err;
  }
  const { application, isEmployer } = access;
  if (!isEmployer || application.jobId !== id) notFound();

  const profile = application.seeker.seekerProfile;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/employer/jobs/${id}`}
        className="text-sm text-stone-500 hover:text-stone-800"
      >
        ← All applicants
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">
            {profile?.headline ?? "Candidate"}
            {showEduBadge(application.seeker) && (
              <span className="ml-2 align-middle inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                Verified student
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Applied{" "}
            {formatDistanceToNow(application.submittedAt, { addSuffix: true })}{" "}
            · {application.seeker.email}
          </p>
        </div>
        <StatusChip status={application.status} />
      </div>

      <div className="mt-6 rounded-lg border border-indigo-100 bg-indigo-50 p-5">
        <h2 className="text-sm font-semibold text-indigo-900">
          Why they want to join you
        </h2>
        <p className="mt-2 text-stone-800">“{application.intentStatement}”</p>
      </div>

      {profile?.skills && profile.skills.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-stone-700">Skills</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile?.bio && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-stone-700">About</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">
            {profile.bio}
          </p>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-stone-700">Resume</h2>
        {profile?.resumeKey ? (
          <a
            href={`/api/resumes/${profile.resumeKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            View resume (PDF)
          </a>
        ) : (
          <p className="mt-2 text-sm text-stone-500">No resume uploaded.</p>
        )}
      </div>

      <div className="mt-10 border-t border-stone-200 pt-6">
        <h2 className="text-sm font-semibold text-stone-700 mb-3">
          Update status{" "}
          <span className="font-normal text-stone-400">
            (the candidate is notified by email)
          </span>
        </h2>
        <StatusButtons
          applicationId={application.id}
          currentStatus={application.status}
        />
      </div>
    </div>
  );
}
