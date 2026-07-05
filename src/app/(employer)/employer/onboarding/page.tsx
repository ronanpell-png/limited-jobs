import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentDbUser } from "@/lib/auth/session";
import { EmployerOnboardingForm } from "@/components/employer/EmployerOnboardingForm";

export const metadata = { title: "Company setup — Limited" };
export const dynamic = "force-dynamic";

export default async function EmployerOnboardingPage() {
  const user = await currentDbUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "EMPLOYER") redirect("/dashboard");

  const membership = await db.companyMember.findFirst({
    where: { userId: user.id },
  });
  if (membership) redirect("/employer/jobs");

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold">Set up your company</h1>
      <p className="mt-2 text-sm text-stone-600">
        Candidates see this on every job you post. They&apos;re spending 1 of
        only 8 weekly applications on you — show them who you are.
      </p>
      <div className="mt-8">
        <EmployerOnboardingForm />
      </div>
    </div>
  );
}
