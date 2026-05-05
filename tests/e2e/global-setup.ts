import { execSync } from "child_process";

export default async function globalSetup() {
  const url =
    process.env.E2E_DATABASE_URL ||
    "postgresql://eierhof:eierhof@localhost:5432/eierhof_ems_test";

  // Ensure the test DB exists. Connect to the maintenance "postgres" DB and
  // create eierhof_ems_test if missing — idempotent.
  const adminUrl = url.replace(/\/[^/?]+(\?|$)/, "/postgres$1");
  try {
    execSync(
      `psql "${adminUrl}" -tAc "SELECT 1 FROM pg_database WHERE datname='eierhof_ems_test'" | grep -q 1 || psql "${adminUrl}" -c "CREATE DATABASE eierhof_ems_test"`,
      { stdio: "pipe", shell: "/bin/bash" }
    );
  } catch {
    // psql may not be on PATH locally — fall through; `prisma db push` below
    // surfaces a clear error if the DB really doesn't exist.
  }

  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
