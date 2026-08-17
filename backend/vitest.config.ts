import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/env.setup.ts", "./tests/setup.ts"],
    testTimeout: 15000,
    hookTimeout: 20000,
    pool: "forks",
    maxWorkers: 1,   // replaces poolOptions.forks.singleFork: true
    isolate: false,  // replaces poolOptions.forks.singleFork behavior (no cross-file collision)
  },
});