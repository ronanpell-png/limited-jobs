import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentDbUser } from "@/lib/auth/session";
import { AcceptInviteButton } from "@/components/employer/AcceptInviteButton";

export const metadata = { title: "Employer invite — Limited" };
export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await currentDbUser();
  if (!user) redirect(`/sign-in?redirect_url=/employer/invite/${token}`);
  if (user.role === "EMPLOYER") redirect("/employer/jobs");

  const invite = await db.employerInvite.findUnique({ where: { token } });
  const valid =
    invite &&
    !invite.acceptedAt &&
    invite.expiresAt > new Date() &&
    invite.email.toLowerCase() === user.email.toLowerCase();

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Employer access</h1>
      {!valid ? (
        <p className="mt-4 text-sm text-stone-600">
          This invite is invalid, expired, already used, or was issued to a
          different email address. Contact us if you believe this is a mistake.
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-stone-600">
            You&apos;ve been invited to hire on Limited
            {invite.companyName ? ` for ${invite.companyName}` : ""}. Accepting
            converts this account ({user.email}) into an employer account.
          </p>
          <div className="mt-6">
            <AcceptInviteButton token={token} />
          </div>
        </>
      )}
    </div>
  );
}
