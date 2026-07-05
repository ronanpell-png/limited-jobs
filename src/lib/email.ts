/**
 * Transactional email via Resend. When RESEND_API_KEY is unset (local dev),
 * emails are logged to the console instead of sent.
 */

type EmailParams = {
  to: string;
  subject: string;
  text: string;
};

export async function sendEmail({ to, subject, text }: EmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Limited Jobs <notifications@example.com>";

  if (!apiKey) {
    console.log(`[email:dev] to=${to} subject="${subject}"\n${text}`);
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({ from, to, subject, text });
  } catch (err) {
    // Notifications are best-effort; never fail the main flow.
    console.error("email send failed", err);
  }
}

export function applicationStatusEmail(params: {
  jobTitle: string;
  companyName: string;
  status: string;
}): { subject: string; text: string } {
  const { jobTitle, companyName, status } = params;
  const friendly: Record<string, string> = {
    VIEWED: "was viewed by the employer",
    SHORTLISTED: "was shortlisted",
    REJECTED: "was not selected this time",
    HIRED: "resulted in an offer — congratulations!",
  };
  return {
    subject: `Update on your application to ${companyName}`,
    text:
      `Your application for "${jobTitle}" at ${companyName} ${friendly[status] ?? `status changed to ${status}`}.` +
      `\n\nView your applications: ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard`,
  };
}

export function newApplicationEmail(params: {
  jobTitle: string;
  applicantHeadline: string;
}): { subject: string; text: string } {
  return {
    subject: `New applicant for ${params.jobTitle}`,
    text:
      `A new candidate applied to "${params.jobTitle}": ${params.applicantHeadline}.` +
      `\n\nRemember: applicants spend 1 of only 8 weekly applications to reach you.` +
      `\n\nReview applicants: ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/employer/jobs`,
  };
}

export function jobCapReachedEmail(params: {
  jobTitle: string;
  cap: number;
}): { subject: string; text: string } {
  return {
    subject: `"${params.jobTitle}" reached its applicant limit`,
    text:
      `Your job "${params.jobTitle}" hit ${params.cap} applications and is now paused.` +
      `\n\nResearch shows most hires come from the first ${params.cap} applicants. ` +
      `If you need more, you can reopen the role with one click from your dashboard.` +
      `\n\nManage jobs: ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/employer/jobs`,
  };
}
