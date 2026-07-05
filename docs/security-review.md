# Pre-Launch Security Review

Status of the pre-launch checklist from the build plan. "Verified" means
checked programmatically or by direct test against the built app; "pending"
items require real Clerk keys / production infrastructure and must be
re-verified before inviting real users.

## Checklist

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | All API routes have auth checks | Verified | Clerk middleware protects everything except explicitly public routes; `/api/cron/*` requires `CRON_SECRET` bearer (tested 401 without, 200 with); `/api/webhooks/clerk` requires a valid Svix signature (tested 400 without) |
| 2 | IDOR: seeker/employer cross-access blocked | Partially verified | Engine test proves a stranger cannot withdraw another seeker's application; `requireJobOwner` / `requireApplicationAccess` / `requireResumeAccess` guard every sensitive read. **Re-run the manual browser IDOR script (below) with real Clerk keys before launch** |
| 3 | Rate limiting on apply, upload, sign-up paths | Verified (in-memory) | `enforceRateLimit` on apply (10/10min per user, 30/10min per IP), resume upload (5/hr), jobs listing (60/min per IP). Sign-up throttling + CAPTCHA delegated to Clerk attack protection — **enable in Clerk dashboard**. Set Upstash env vars in production for cross-instance limits |
| 4 | Clerk webhook signature verified | Verified | Svix verification; unsigned POST returns 400 |
| 5 | Cron endpoint protected by CRON_SECRET | Verified | 401 without bearer token, 200 with |
| 6 | Resume files not publicly accessible | Verified | Stored in `storage/resumes/` (outside web root, gitignored); served only via `/api/resumes/[key]` behind session + `requireResumeAccess`; unknown/unauthorized requests return 404/403 |
| 7 | Security headers present | Verified | `curl -I` shows X-Frame-Options DENY, nosniff, HSTS, Referrer-Policy, Permissions-Policy, CSP. Re-check with securityheaders.com after deploy |
| 8 | No secrets in git history | Verified | `.env` gitignored from the first commit; `.env.example` has placeholders only; `git log -p` grep clean |
| 9 | Error pages do not leak stack traces | Verified | Production 404/500 pages contain no traces; server actions return generic messages for non-domain errors (`toSafeMessage`) |
| 10 | Admin routes inaccessible to non-admins | Verified | Middleware requires session; page redirects non-ADMIN roles; role lives in DB and is only ever changed server-side (invite flow, make-admin script, admin action) with audit entries |
| 11 | Audit log recording sensitive actions | Verified | Engine tests assert audit rows on submit; applies/withdrawals/refunds/status changes/bans/reopens/resume events all write `AuditLog` |
| 12 | Dependency vulnerabilities | Verified (no critical) | `npm audit`: 0 critical/high; 2 moderate in Next's transitive postcss (fix ships with future Next release). CI gates on `--audit-level=critical` |
| 13 | Privacy policy and ToS pages live | Verified | `/privacy` and `/terms` return 200 |
| 14 | Budget/cap enforcement race-safe | Verified | Vitest race tests: concurrent applies never overspend budget or exceed job cap (Postgres row locks + idempotency keys) |

## Manual IDOR test script (run with real Clerk keys before beta)

1. Create two seeker accounts (A, B). A applies to a job.
2. As B, request `/employer/jobs/{jobId}/applicants/{appId}` → expect 404.
3. As B, request `/api/resumes/{A's-resume-key}` → expect 403.
4. Create two employer accounts at different companies. As employer 2,
   request employer 1's job detail and applicant pages → expect 404.
5. As seeker A, attempt `updateApplicationStatus` via the UI of another
   company's application → expect "Only the employer can update status".

## Anti-abuse measures in place (MVP)

- Hard application budget (8 per rolling 7 days) — the core limit itself
- Honeypot field on the apply form (silent fake-success on trigger)
- Idempotency keys — double-submits and replays return the original application
- Exact-duplicate intent statements rejected across a seeker's history
- Resume SHA-256 dedup — same file on multiple accounts flags `resume.dedup_flag`
  (surfaced in the /admin security panel)
- PDF-only uploads: magic-byte check, 5 MB max, UUID filenames, private storage
- Invite-only employer onboarding with expiring, email-bound tokens
- Suspended/banned users fail session resolution everywhere

## Post-MVP security roadmap (from the plan)

| Priority | Measure | Trigger |
|---|---|---|
| P1 | `.edu` verification (`EDU_VERIFICATION_MODE=badge` → `required`) | Bot accounts > 5% of signups |
| P1 | Company domain verification (DNS TXT) | Fake employer postings appear |
| P2 | MFA required for all employers | Any employer account compromise |
| P2 | PDF virus scanning on upload | First malware upload incident |
| P2 | Intent similarity detection (fuzzy, not just exact) | Copy-paste spam detected |
| P3 | Device fingerprinting | Multi-account abuse detected |
| P3 | WAF (Cloudflare) | DDoS or scraping at scale |
