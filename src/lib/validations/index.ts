import { z } from "zod";
import { INTENT_MAX_LENGTH, INTENT_MIN_LENGTH } from "@/lib/config";

/**
 * Every user-supplied input crosses one of these schemas before touching
 * the database. No `req.body` is ever spread directly into Prisma.
 */

const noHtml = /^[^<>]*$/;

export const intentStatementSchema = z
  .string()
  .trim()
  .min(
    INTENT_MIN_LENGTH,
    `Tell us why you're interested (at least ${INTENT_MIN_LENGTH} characters)`
  )
  .max(INTENT_MAX_LENGTH, `Keep it under ${INTENT_MAX_LENGTH} characters`)
  .regex(noHtml, "HTML is not allowed")
  .refine(
    (val) => val.split(/\s+/).length >= 8,
    "Please write a complete sentence"
  );

export const applySchema = z.object({
  jobId: z.string().cuid(),
  intentStatement: intentStatementSchema,
  idempotencyKey: z.string().uuid(),
  // Honeypot: real users never fill this hidden field.
  website: z.string().max(0).optional().or(z.literal("")),
});

export const seekerOnboardingSchema = z.object({
  headline: z
    .string()
    .trim()
    .min(3, "Add a short headline")
    .max(120)
    .regex(noHtml, "HTML is not allowed"),
  bio: z.string().trim().max(2000).regex(noHtml, "HTML is not allowed").optional(),
  skills: z
    .array(z.string().trim().min(1).max(40).regex(noHtml))
    .max(20, "At most 20 skills"),
});

export const employerOnboardingSchema = z.object({
  companyName: z.string().trim().min(2).max(80).regex(noHtml),
  website: z.string().trim().url("Enter a valid URL").max(200).optional().or(z.literal("")),
  description: z.string().trim().max(2000).regex(noHtml).optional(),
});

export const jobPostSchema = z
  .object({
    title: z.string().trim().min(3).max(100).regex(noHtml),
    description: z.string().trim().min(50, "Describe the role (at least 50 characters)").max(10_000),
    locationType: z.enum(["REMOTE", "HYBRID", "ONSITE"]),
    location: z.string().trim().max(100).regex(noHtml).optional().or(z.literal("")),
    employmentType: z.enum(["Full-time", "Part-time", "Contract", "Internship"]),
    salaryMin: z.coerce.number().int().min(0).max(10_000_000).optional(),
    salaryMax: z.coerce.number().int().min(0).max(10_000_000).optional(),
  })
  .refine(
    (data) =>
      data.salaryMin === undefined ||
      data.salaryMax === undefined ||
      data.salaryMin <= data.salaryMax,
    { message: "Minimum salary must not exceed maximum", path: ["salaryMin"] }
  )
  .refine((data) => data.locationType === "REMOTE" || !!data.location, {
    message: "Location is required for hybrid/onsite roles",
    path: ["location"],
  });

export const applicationStatusSchema = z.enum([
  "VIEWED",
  "SHORTLISTED",
  "REJECTED",
  "HIRED",
]);

export const jobSearchSchema = z.object({
  q: z.string().trim().max(100).regex(noHtml).optional(),
  locationType: z.enum(["REMOTE", "HYBRID", "ONSITE"]).optional(),
});
