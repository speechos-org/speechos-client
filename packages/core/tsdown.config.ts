import { defineConfig } from "tsdown";

const isWatch = process.argv.includes("--watch") || process.env.TSDOWN_WATCH === "true";

export default defineConfig({
  entry: "./src/index.ts",
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: !isWatch,
});
