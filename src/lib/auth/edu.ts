import { eduVerificationMode } from "@/lib/config";

/**
 * Post-MVP Phase 6: .edu verification.
 *
 * Modes (EDU_VERIFICATION_MODE env var):
 *  - "off"      (MVP default) — no .edu logic anywhere.
 *  - "badge"    (Phase 6a)    — .edu-verified seekers get a "Verified
 *                               Student" badge; everyone may sign up.
 *  - "required" (Phase 6b)    — new seeker signups must have a verified
 *                               .edu email; existing users grandfathered.
 *
 * Verification is delegated to Clerk: an email only counts if Clerk marks
 * it "verified" (the user clicked the confirmation link), so we never
 * trust an unverified address.
 */

const EDU_EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.edu$/i;

export function isEduEmail(email: string): boolean {
  return EDU_EMAIL_REGEX.test(email);
}

export type ClerkEmailAddress = {
  email_address: string;
  verification?: { status?: string } | null;
};

/** Extract the first Clerk-verified .edu address, if any. */
export function findVerifiedEduEmail(
  emails: ClerkEmailAddress[]
): string | null {
  for (const entry of emails) {
    if (
      isEduEmail(entry.email_address) &&
      entry.verification?.status === "verified"
    ) {
      return entry.email_address.toLowerCase();
    }
  }
  return null;
}

/** Whether a "Verified Student" badge should render for this user. */
export function showEduBadge(user: { eduVerified: boolean }): boolean {
  return eduVerificationMode() !== "off" && user.eduVerified;
}

/** Phase 6b gate: may this new seeker sign up? */
export function seekerSignupAllowed(user: { eduVerified: boolean }): boolean {
  if (eduVerificationMode() !== "required") return true;
  return user.eduVerified;
}
