import { execSync } from "node:child_process";

const localTestDb =
  "postgresql://postgres:postgres@localhost:5445/limited_jobs_test";

export default function setup() {
  const url = process.env.CI_HAS_POSTGRES
    ? (process.env.DATABASE_URL ?? localTestDb)
    : localTestDb;

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}
