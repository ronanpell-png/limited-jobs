import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentDbUser } from "@/lib/auth/session";
import { OnboardingForm } from "@/components/seeker/OnboardingForm";

export const metadata = { title: "Set up your profile — Limited" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await currentDbUser();
  if (!user) redirect("/sign-in");
  if (user.role === "EMPLOYER") redirect("/employer/onboarding");
  if (user.role === "ADMIN") redirect("/admin");

  const profile = await db.seekerProfile.findUnique({
    where: { userId: user.id },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold">
        {profile ? "Edit your profile" : "Set up your profile"}
      </h1>
      <p className="mt-2 text-sm text-stone-600">
        Employers see this alongside every application you send. You get 8
        applications a week — make sure your profile earns them a reply.
      </p>
      <div className="mt-8">
        <OnboardingForm
          initial={
            profile
              ? {
                  headline: profile.headline,
                  bio: profile.bio ?? "",
                  skills: profile.skills.join(", "),
                  hasResume: Boolean(profile.resumeKey),
                }
              : null
          }
        />
      </div>
    </div>
  );
}
