import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentDbUser } from "@/lib/auth/session";
import { JobPostForm } from "@/components/employer/JobPostForm";
import { DEFAULT_MAX_APPLICATIONS, JOB_OPEN_DAYS } from "@/lib/config";

export const metadata = { title: "Post a job — Limited" };
export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const user = await currentDbUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "EMPLOYER") redirect("/dashboard");

  const membership = await db.companyMember.findFirst({
    where: { userId: user.id },
  });
  if (!membership) redirect("/employer/onboarding");

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold">Post a job</h1>
      <p className="mt-2 text-sm text-stone-600">
        Your role goes live immediately and accepts applications for{" "}
        {JOB_OPEN_DAYS} days or until {DEFAULT_MAX_APPLICATIONS} candidates
        apply — whichever comes first.
      </p>
      <div className="mt-8">
        <JobPostForm />
      </div>
    </div>
  );
}
