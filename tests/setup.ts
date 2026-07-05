import { beforeEach, afterAll } from "vitest";
import { db } from "@/lib/db";
import { __resetMemoryRateLimits } from "@/lib/security/rate-limit";

beforeEach(async () => {
  // Truncate everything between tests (cascades handle FK order).
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLog",
      "ApplicationBudgetEntry",
      "Application",
      "JobCapState",
      "Job",
      "EmployerInvite",
      "CompanyMember",
      "Company",
      "EmployerProfile",
      "SeekerProfile",
      "User"
    CASCADE
  `);
  __resetMemoryRateLimits();
});

afterAll(async () => {
  await db.$disconnect();
});
