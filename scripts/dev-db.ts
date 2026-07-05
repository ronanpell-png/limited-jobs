/**
 * Boots an embedded PostgreSQL server for local development.
 * Data persists in .pgdata/ (gitignored). Stop with Ctrl+C.
 *
 * Usage: npm run db:start
 */
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";

const PORT = Number(process.env.DEV_DB_PORT ?? 5445);
const DB_NAME = "limited_jobs";

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: path.join(process.cwd(), ".pgdata"),
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: true,
  });

  try {
    await pg.initialise();
  } catch {
    // Already initialised — fine for persistent data dirs.
  }
  await pg.start();

  for (const name of [DB_NAME, `${DB_NAME}_test`]) {
    try {
      await pg.createDatabase(name);
      console.log(`Created database "${name}"`);
    } catch {
      // Database already exists.
    }
  }

  console.log(
    `\nPostgres running at postgresql://postgres:postgres@localhost:${PORT}/${DB_NAME}\n` +
      `Press Ctrl+C to stop.`
  );

  const shutdown = async () => {
    console.log("\nStopping Postgres...");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
