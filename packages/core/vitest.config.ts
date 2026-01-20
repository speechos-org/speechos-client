import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use happy-dom for localStorage support in transcript-store tests
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    globals: true,
  },
});
