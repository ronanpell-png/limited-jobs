# Limited — the job platform where every application counts

A two-sided job marketplace for startup hiring built on intentional scarcity:

- **Seekers get 8 applications per rolling 7-day window.** No spray-and-pray; every application is deliberate.
- **Jobs auto-pause at 50 applicants or 7 days** (whichever comes first). Employers can reopen with one click (+25 slots).
- **Every application requires an intent statement** ("why this company?") — exact copy-paste is rejected.
- **Ghosted applications refund.** Withdraw after 14 days with no employer response and the credit comes back.
- **No pay-to-apply-more, ever.** The limit is the product, not a paywall.

The design follows Horton & Vasserman (2021): capping jobs at 50 applicants cut application volume 11% with no drop in hiring or match quality.

## Stack

Next.js 15 (App Router) · TypeScript · Prisma + PostgreSQL · Clerk (auth) · Tailwind CSS · Resend (email) · Vitest

## Local development

```bash
npm install
cp .env.example .env        # then fill in Clerk keys (see below)

npm run db:start            # boots an embedded Postgres on :5445 (keep running)
npm run db:migrate          # apply migrations
npm run db:seed             # 3 demo companies, 10 open jobs

npm run dev                 # http://localhost:3000
```

### Clerk setup (required for sign-in)

1. Create a free app at [dashboard.clerk.com](https://dashboard.clerk.com).
2. Copy the publishable + secret keys into `.env`.
3. Add a webhook endpoint → `https://<your-host>/api/webhooks/clerk` subscribed to
   `user.created`, `user.updated`, `user.deleted`; copy the signing secret to
   `CLERK_WEBHOOK_SECRET`. (For local dev, use `ngrok` or the Clerk CLI to tunnel.)
4. Enable bot protection / CAPTCHA in Clerk → **User & Authentication → Attack protection**.

### Roles

Everyone signs up as a **seeker**. Other roles are assigned server-side only:

```bash
npx tsx scripts/make-admin.ts you@example.com   # bootstrap the first admin
```

Admins invite employers from `/admin` (invite-only during beta). Accepting an
invite converts the account to an employer.

### Tests

```bash
npm test          # engine tests run against the embedded Postgres (db:start must be running)
npm run lint
npm run typecheck
```

The test suite covers the must-pass launch scenarios: budget exhaustion (9th
application blocked), cap autopause at the limit, reopen behavior, the 14-day
refund boundary, duplicate-application blocking, and concurrency races on both
the budget and the cap.

## Deployment (Vercel + Neon)

1. Create a Neon (or Supabase) Postgres and set `DATABASE_URL`.
2. `npx prisma migrate deploy` against production.
3. Import the repo in Vercel; set all env vars from `.env.example`.
4. Set `CRON_SECRET` — Vercel Cron (configured in `vercel.json`: hourly job autopause, daily digest email) sends it automatically.
5. Point the Clerk webhook at the production URL.
6. Optional: set `UPSTASH_REDIS_REST_URL/TOKEN` for distributed rate limiting
   (falls back to in-memory per instance when unset).

**Resume storage note:** resumes are stored on the local filesystem
(`storage/resumes/`) behind an authorization-checked route. On serverless
hosts, swap the internals of `src/lib/security/resume-storage.ts` for Supabase
Storage or Uploadthing (private bucket) — the interface is designed for that swap.

## Product configuration

All the numbers that define the platform live in [`src/lib/config.ts`](src/lib/config.ts):
budget size, window length, refund threshold, job cap, reopen bonus, intent
statement length.

### Post-MVP: .edu verification

`EDU_VERIFICATION_MODE` controls the bot-protection rollout:

| Mode | Behavior |
|---|---|
| `off` (default) | No .edu logic |
| `badge` | Clerk-verified .edu users get a "Verified student" badge shown to employers |
| `required` | New seeker signups require a verified .edu email (existing users grandfathered) |

Decision gate per the plan: only move to `required` if bot/spam accounts exceed ~5% of applications.

## Security

See [docs/security-review.md](docs/security-review.md) for the pre-launch
checklist and its current status. Highlights: role checks on every server
action, IDOR guards on applications/resumes, transactional budget/cap
enforcement with row locks, idempotency keys on applies, rate limiting,
honeypot + intent-reuse rejection, signature-verified webhooks,
secret-protected cron, audit logging on all sensitive actions, and strict
security headers.

## Launch runbook (private beta)

1. Seed 5–10 real employer partners via `/admin` invites; have each post 1–3 roles.
2. Invite 50–100 seekers from startup communities.
3. Watch `/admin` security flags (resume dedup, rate limits, forbidden hits).
4. Collect feedback on how the limit feels; tune `BUDGET_LIMIT` if warranted.
5. Metrics to track: applications/seeker/week, employer response rate,
   time-to-first-response, % of jobs that reopen, jobs with ≥1 application in 7 days.
