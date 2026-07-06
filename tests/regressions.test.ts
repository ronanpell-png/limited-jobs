import { describe, expect, it } from "vitest";
import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { submitApplication, withdrawApplication } from "@/lib/applications/submit";
import { applySchema } from "@/lib/validations";
import {
  createEmployerWithCompany,
  createOpenJob,
  createSeeker,
  idem,
  intent,
} from "./helpers";

describe("regression: concurrent withdrawals refund at most once", () => {
  it("two racing withdrawals of the same refund-eligible application produce one refund", async () => {
    const seeker = await createSeeker();
    const { company } = await createEmployerWithCompany();
    const job = await createOpenJob(company.id);
    const app = await submitApplication({
      jobId: job.id,
      seekerId: seeker.id,
      intentStatement: intent("double-withdraw"),
      idempotencyKey: idem(),
    });
    await db.application.update({
      where: { id: app.id },
      data: { submittedAt: subDays(new Date(), 20) },
    });

    const results = await Promise.allSettled([
      withdrawApplication({ applicationId: app.id, seekerId: seeker.id }),
      withdrawApplication({ applicationId: app.id, seekerId: seeker.id }),
    ]);

    const refunds = await db.applicationBudgetEntry.findMany({
      where: { seekerId: seeker.id, delta: 1 },
    });
    expect(refunds).toHaveLength(1);

    // Exactly one withdrawal succeeds; the other sees ALREADY_WITHDRAWN.
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);

    // The cap slot is released exactly once, not twice.
    const cap = await db.jobCapState.findUnique({ where: { jobId: job.id } });
    expect(cap?.applicationCount).toBe(0);
  });
});

describe("regression: honeypot field must parse, not error", () => {
  const base = {
    jobId: "cjld2cjxh0000qzrmn831i7rn",
    intentStatement: intent("honeypot"),
    idempotencyKey: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
  };

  it("accepts an empty honeypot", () => {
    const parsed = applySchema.safeParse({ ...base, website: "" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.website).toBe("");
  });

  it("accepts a FILLED honeypot so the action can fake success", () => {
    // A bot filling the hidden field must NOT get a validation error —
    // that would reveal the trap. The schema accepts it; the action lies.
    const parsed = applySchema.safeParse({
      ...base,
      website: "https://spam.example.com",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.website).toBeTruthy();
  });

  it("accepts a missing honeypot", () => {
    const parsed = applySchema.safeParse(base);
    expect(parsed.success).toBe(true);
  });
});
