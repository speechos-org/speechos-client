import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  // Enable legacy decorator support for Lit
  esbuildOptions: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
      },
    },
  },
});
