# Notes for whoever works on this next

This file is a handoff from the agent that built the MVP (July 2026). Read it
before making changes — it captures the decisions and sharp edges that aren't
obvious from the code alone.

## What this is

A job platform whose entire product thesis is **scarcity**: seekers get 8
applications per rolling 7 days, jobs autopause at 50 applicants or 7 days.
The research grounding is Horton & Vasserman (2021) — capping applicant pools
did not reduce hiring or match quality. The full product plan and security
review live in `docs/` and the owner's Cursor plan file.

**Protect the invariant: never sell more application slots.** The limit is the
product. Monetization is employer-side only (postings, subscriptions). An
applicant-side paywall would undermine both the brand and the evidence base
(application fees reduced hiring in the research).

## Current state (honest)

Working and tested:
- Budget + cap engines, transactional with row locks (`src/lib/applications/`,
  `src/lib/jobs/cap.ts`) — 21 tests cover the race conditions and refund
  boundaries. Run them before touching this code, and add tests if you change it.
- Full seeker/employer/admin UX, security headers, rate limiting, audit log,
  IDOR guards, private resume storage.

Not done yet (the gap between "builds" and "beta"):
- **Clerk webhook is not wired for local dev.** Users who sign up exist in
  Clerk but not in Postgres until the webhook fires. Locally that needs a
  tunnel (ngrok / Clerk CLI); in production, point the webhook at
  `/api/webhooks/clerk`. Until then `/dashboard` fails after sign-up.
- **No deployment.** README has the Vercel + Neon runbook.
- **Resume storage is local filesystem** (`storage/resumes/`). Fine for one
  machine; swap the internals of `src/lib/security/resume-storage.ts` for a
  private bucket before deploying to serverless. The interface was designed
  for that swap.
- **Payments, matching, messaging** — deliberately out of MVP scope.

## Sharp edges that already bit someone

1. **Two processes, two terminals.** `npm run db:start` (embedded Postgres,
   port 5445) must be running before `npm run dev`. Most "Can't reach database
   server" reports are just this.
2. **Stale postmaster lock.** If `db:start` fails with `postmaster.pid already
   exists`, either Postgres is already running (fine) or it crashed — kill the
   orphan and delete `.pgdata/postmaster.pid`.
3. **`.env` formatting.** One `KEY="value"` per line. The owner once pasted
   both Clerk keys into one value; the symptom was `ERR_NAME_NOT_RESOLVED` on
   `clerk.example.com` (the placeholder publishable key base64-encodes that
   domain). Env changes require a dev-server restart, and stale Clerk cookies
   may need an incognito window.
4. **`npm audit fix --force` will destroy the app** (downgrades Next.js to
   v9). The 2 moderate advisories are in Next's transitive postcss; CI gates
   on critical only.
5. **embedded-postgres versioning** is odd — stable tags lag; we pinned
   `18.4.0-beta.17`. Don't "fix" it to a ^17 range; that version doesn't exist.

## Design decisions worth keeping

- **Roles live in Postgres, never Clerk.** Clerk answers "who is this";
  the DB answers "what may they do". Role changes happen only server-side
  (invite acceptance, `scripts/make-admin.ts`, admin panel) and are audited.
- **Every product number is in `src/lib/config.ts`.** Budget size, window,
  refund threshold, cap, reopen bonus. Tune there, nowhere else.
- **All mutations to budget/cap go through one transaction** with
  `SELECT ... FOR UPDATE` on the job cap row and user row, plus idempotency
  keys. This is what makes double-clicks and bots harmless. Don't add a
  "quick" mutation path that skips it.
- **.edu verification is built but dark** (`EDU_VERIFICATION_MODE`:
  off → badge → required). The decision gate: flip to `required` only if
  bots exceed ~5% of applications. Don't enable it earlier; it excludes
  mid-career candidates the startup beachhead needs.
- **Errors shown to users come from `toSafeMessage`** — domain errors get
  their message, everything else is generic. Keep it that way; stack traces
  and Prisma errors leak schema details.

## Before beta (short list)

1. Wire the Clerk webhook (prod URL + `CLERK_WEBHOOK_SECRET`).
2. Deploy (Vercel + Neon), run `prisma migrate deploy`, set all env vars.
3. Swap resume storage to a private bucket.
4. Re-run the manual IDOR script in `docs/security-review.md` with real accounts.
5. Enable Clerk attack protection (CAPTCHA) in the dashboard.
6. Seed real employers via `/admin` invites — employer access is invite-only
   on purpose.

## The thing to remember

Every feature request will pull toward "more" — more applications, more
postings, more volume. The product only works if you keep saying no. The
scarcity is not a limitation to engineer around; it is the whole point.
