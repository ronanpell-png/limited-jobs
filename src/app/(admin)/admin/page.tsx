import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { db } from "@/lib/db";
import { currentDbUser } from "@/lib/auth/session";
import { InviteForm } from "@/components/admin/InviteForm";
import { UserStatusButtons } from "@/components/admin/UserStatusButtons";

export const metadata = { title: "Admin — Limited" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await currentDbUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [users, jobs, invites, flags] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { seekerProfile: { select: { headline: true } } },
    }),
    db.job.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { company: true, capState: true },
    }),
    db.employerInvite.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    db.auditLog.findMany({
      where: { action: { in: ["resume.dedup_flag", "security.rate_limited", "security.forbidden"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-12">
      <h1 className="text-2xl font-bold">Admin</h1>

      <section>
        <h2 className="text-lg font-semibold">Invite an employer</h2>
        <div className="mt-3 max-w-md">
          <InviteForm />
        </div>
        {invites.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                <th className="py-2">Email</th>
                <th>Company</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => (
                <tr key={inv.id} className="border-b border-stone-100">
                  <td className="py-2">{inv.email}</td>
                  <td>{inv.companyName ?? "—"}</td>
                  <td>
                    {inv.acceptedAt
                      ? "Accepted"
                      : inv.expiresAt < new Date()
                        ? "Expired"
                        : "Pending"}
                  </td>
                  <td className="text-stone-500">
                    {formatDistanceToNow(inv.createdAt, { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Users ({users.length})</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
              <th className="py-2">Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-stone-100">
                <td className="py-2">
                  {u.email}
                  {u.eduVerified && (
                    <span className="ml-1.5 text-xs text-sky-600">.edu ✓</span>
                  )}
                </td>
                <td>{u.role.toLowerCase()}</td>
                <td>{u.status.toLowerCase()}</td>
                <td className="text-stone-500">
                  {formatDistanceToNow(u.createdAt, { addSuffix: true })}
                </td>
                <td>
                  {u.id !== user.id && (
                    <UserStatusButtons userId={u.id} status={u.status} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Jobs ({jobs.length})</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
              <th className="py-2">Title</th>
              <th>Company</th>
              <th>Status</th>
              <th>Applicants</th>
              <th>Reopens</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-b border-stone-100">
                <td className="py-2">{j.title}</td>
                <td>{j.company.name}</td>
                <td>{j.status.toLowerCase()}</td>
                <td>
                  {j.capState?.applicationCount ?? 0}/{j.maxApplications}
                </td>
                <td>{j.capState?.reopenCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Security flags</h2>
        {flags.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">No flags. Quiet is good.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                <th className="py-2">Action</th>
                <th>Target</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.id} className="border-b border-stone-100">
                  <td className="py-2 font-mono text-xs">{f.action}</td>
                  <td className="font-mono text-xs">
                    {f.targetType}:{f.targetId.slice(0, 12)}…
                  </td>
                  <td className="text-stone-500">
                    {formatDistanceToNow(f.createdAt, { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
