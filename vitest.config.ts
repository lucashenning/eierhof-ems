import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // tsconfig.json sets jsx:preserve for Next; tell the test runtime to actually
  // transform JSX so PDF document files (Lieferschein.tsx, Rechnung.tsx) load.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globals: false,
    // Tests share one local Postgres (docker-compose). Run files sequentially
    // to avoid two test files truncating each other's data.
    fileParallelism: false,
    setupFiles: ["tests/setup.ts"],
    testTimeout: 30000,
    server: {
      deps: {
        inline: ["@prisma/client"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
