import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

// Point E2E tests at a dedicated DB so they can TRUNCATE between runs without
// nuking the developer's seeded customers in the main `eierhof_ems` DB.
const TEST_DATABASE_URL =
  process.env.E2E_DATABASE_URL ||
  "postgresql://eierhof:eierhof@localhost:5432/eierhof_ems_test";

// Make the test DB available to fixtures.ts in this same process too
process.env.DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Use dev mode on a separate port so it doesn't collide with a running
    // `npm run dev`. First request triggers compilation; subsequent ones are fast.
    command: `next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: { DATABASE_URL: TEST_DATABASE_URL },
  },
});
