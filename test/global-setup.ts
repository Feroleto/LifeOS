import { execFileSync } from "node:child_process";

import { config } from "dotenv";

/**
 * Makes sure the test database exists and has all migrations applied before any
 * suite runs.
 */
export default function globalSetup(): void {
  config({ path: ".env.test", override: true, quiet: true });

  const databaseUrl = process.env["DATABASE_URL"];

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set in .env.test");
  }

  if (!/\/[^/]*test/i.test(new URL(databaseUrl).pathname)) {
    throw new Error(
      `Refusing to run the tests: the database in DATABASE_URL does not look like a test one (${databaseUrl})`,
    );
  }

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
