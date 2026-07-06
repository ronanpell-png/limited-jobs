import { describe, expect, it } from "vitest";
import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { sendDailyDigests } from "@/lib/digest";
import { getCompanyResponseRates } from "@/lib/companies/response-rate";
import { submitApplication } from "@/lib/applications/submit";
import {
  createEmployerWithCompany,
  createOpenJob,
  createSeeker,
  idem,
  intent,
} from "./helpers";

describe("daily digest", () => {
  it("emails seekers whose skills match a fresh job, skips non-matches", async () => {
    const { company } = await createEmployerWithCompany();
    const job = await createOpenJob(company.id);
    await db.job.update({
      where: { id: job.id },
      data: { description: "We need deep kubernetes and terraform experience." },
    });

    const matching = await createSeeker();
    await db.seekerProfile.update({
      where: { userId: matching.id },
      data: { skills: ["Kubernetes", "Go"] },
    });
    const nonMatching = await createSeeker();
    await db.seekerProfile.update({
      where: { userId: nonMatching.id },
      data: { skills: ["Figma"] },
    });

    const { sent } = await sendDailyDigests();
    expect(sent).toBe(1);
  });

  it("does not email a seeker who already applied to the only matching job", async () => {
    const { company } = await createEmployerWithCompany();
    const job = await createOpenJob(company.id);
    await db.job.update({
      where: { id: job.id },
      data: { description: "Rust systems programming role." },
    });

    const seeker = await createSeeker();
    await db.seekerProfile.update({
      where: { userId: seeker.id },
      data: { skills: ["Rust"] },
    });
    await submitApplication({
      jobId: job.id,
      seekerId: seeker.id,
      intentStatement: intent("digest-applied"),
      idempotencyKey: idem(),
    });

    const { sent } = await sendDailyDigests();
    expect(sent).toBe(0);
  });

  it("ignores jobs older than 24 hours", async () => {
    const { company } = await createEmployerWithCompany();
    const job = await createOpenJob(company.id);
    await db.job.update({
      where: { id: job.id },
      data: {
        description: "Ancient elixir role.",
        publishedAt: subDays(new Date(), 3),
      },
    });

    const seeker = await createSeeker();
    await db.seekerProfile.update({
      where: { userId: seeker.id },
      data: { skills: ["Elixir"] },
    });

    const { sent } = await sendDailyDigests();
    expect(sent).toBe(0);
  });
});

describe("company response rate", () => {
  it("returns no rate below the minimum sample, then a correct percentage", async () => {
    const { company } = await createEmployerWithCompany();
    const job = await createOpenJob(company.id);

    // 6 applications, 4 days old; employer responded to 3 of them.
    for (let i = 0; i < 6; i++) {
      const seeker = await createSeeker();
      const app = await submitApplication({
        jobId: job.id,
        seekerId: seeker.id,
        intentStatement: intent(`rate-${i}`),
        idempotencyKey: idem(),
      });
      await db.application.update({
        where: { id: app.id },
        data: {
          submittedAt: subDays(new Date(), 4),
          ...(i < 3
            ? { status: "VIEWED", respondedAt: new Date() }
            : {}),
        },
      });
    }

    const rates = await getCompanyResponseRates([company.id]);
    expect(rates.get(company.id)).toBe(50);
  });

  it("returns nothing for a company with too few eligible applications", async () => {
    const { company } = await createEmployerWithCompany();
    const job = await createOpenJob(company.id);

    const seeker = await createSeeker();
    const app = await submitApplication({
      jobId: job.id,
      seekerId: seeker.id,
      intentStatement: intent("rate-small"),
      idempotencyKey: idem(),
    });
    await db.application.update({
      where: { id: app.id },
      data: { submittedAt: subDays(new Date(), 4) },
    });

    const rates = await getCompanyResponseRates([company.id]);
    expect(rates.has(company.id)).toBe(false);
  });
});
