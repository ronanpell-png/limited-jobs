/**
 * Central product configuration — the numbers that define the platform.
 */
export const BUDGET_LIMIT = 8; // applications per rolling window
export const BUDGET_WINDOW_DAYS = 7; // rolling window length
export const REFUND_ELIGIBLE_DAYS = 14; // withdraw refund threshold
export const DEFAULT_MAX_APPLICATIONS = 50; // job cap before autopause
export const JOB_OPEN_DAYS = 7; // job auto-closes this many days after publish
export const REOPEN_EXTRA_SLOTS = 25; // extra applications when employer reopens

export const INTENT_MIN_LENGTH = 50;
export const INTENT_MAX_LENGTH = 300;

export const RESUME_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export type EduVerificationMode = "off" | "badge" | "required";

export function eduVerificationMode(): EduVerificationMode {
  const mode = process.env.EDU_VERIFICATION_MODE;
  if (mode === "badge" || mode === "required") return mode;
  return "off";
}
