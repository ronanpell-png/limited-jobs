/**
 * Promote a user to ADMIN by email. Roles are only ever assigned
 * server-side; this is the bootstrap path for the first admin.
 *
 * Usage: npx tsx scripts/make-admin.ts you@example.com
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = process.argv[2]?.toLowerCase();
  if (!email) {
    console.error("Usage: npx tsx scripts/make-admin.ts <email>");
    process.exit(1);
  }
  const user = await db.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });
  await db.auditLog.create({
    data: {
      action: "user.role_change",
      targetType: "User",
      targetId: user.id,
      metadata: { newRole: "ADMIN", via: "make-admin script" },
    },
  });
  console.log(`${email} is now an admin.`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
