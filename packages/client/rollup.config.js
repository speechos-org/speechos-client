import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import alias from "@rollup/plugin-alias";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const footer = `
  // Expose SpeechOS class directly on window
  if (typeof window !== 'undefined') {
    window.SpeechOS = SpeechOSNamespace.SpeechOS;
    window.SpeechOS.VERSION = SpeechOSNamespace.VERSION;
    window.SpeechOS.events = SpeechOSNamespace.events;
    window.SpeechOS.state = SpeechOSNamespace.state;
    window.SpeechOS.getConfig = SpeechOSNamespace.getConfig;
    window.SpeechOS.setConfig = SpeechOSNamespace.setConfig;
    window.SpeechOS.resetConfig = SpeechOSNamespace.resetConfig;
  }
`;

const baseOutput = {
  format: "iife",
  name: "SpeechOSNamespace",
  sourcemap: true,
  exports: "named",
  extend: true,
  footer,
};

// Create TypeScript plugin with proper path resolution
const createTsPlugin = () => typescript({
  tsconfig: "./tsconfig.json",
  declaration: true,
  declarationMap: true,
  declarationDir: "./dist",
  compilerOptions: {
    target: "ES2022",
    experimentalDecorators: true,
    useDefineForClassFields: false,
    baseUrl: ".",
    paths: {
      "@speechos/core": ["../core/dist/index.d.ts"],
    },
  },
});

// Create shared plugins (each build gets fresh instances)
const createSharedPlugins = () => [
  nodeResolve({
    browser: true,
  }),
  commonjs(),
  createTsPlugin(),
];

// Create plugins for IIFE builds (bundle @speechos/core from dist)
const createBundledPlugins = () => [
  alias({
    entries: [
      {
        find: "@speechos/core",
        replacement: path.resolve(__dirname, "../core/dist/index.js"),
      },
    ],
  }),
  ...createSharedPlugins(),
];

// ESM build config
const esmConfig = {
  input: "src/index.ts",
  output: {
    file: "dist/index.js",
    format: "esm",
    sourcemap: true,
  },
  external: ["@speechos/core", "livekit-client"],
  plugins: createSharedPlugins(),
};

// CJS build config
const cjsConfig = {
  input: "src/index.ts",
  output: {
    file: "dist/index.cjs",
    format: "cjs",
    sourcemap: true,
  },
  external: ["@speechos/core", "livekit-client"],
  plugins: createSharedPlugins(),
};

// Suppress noisy TypeScript warnings about @speechos/core in watch mode
// These occur because TS type-checking runs before the alias plugin resolves the module
const onwarn = (warning, warn) => {
  // Suppress "Cannot find module '@speechos/core'" warnings
  if (warning.plugin === 'typescript' && warning.message?.includes('@speechos/core')) {
    return;
  }
  // Suppress implicit 'any' type warnings that cascade from the above
  if (warning.plugin === 'typescript' && warning.code === 'TS7006') {
    return;
  }
  // Suppress type errors cascading from unresolved @speechos/core
  if (warning.plugin === 'typescript' && (warning.code === 'TS2345' || warning.code === 'TS2339')) {
    return;
  }
  warn(warning);
};

// IIFE unminified config
const iifeConfig = {
  input: "src/index.ts",
  output: {
    ...baseOutput,
    file: "dist/index.iife.js",
  },
  plugins: createBundledPlugins(),
  onwarn,
  watch: {
    include: ['src/**', '../core/dist/**']
  }
};

// IIFE minified config
const iifeMinConfig = {
  input: "src/index.ts",
  output: {
    ...baseOutput,
    file: "dist/index.iife.min.js",
    sourcemap: true,
  },
  plugins: [
    ...createBundledPlugins(),
    terser({
      compress: {
        drop_console: false, // Keep console for debugging in prod
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    }),
  ],
  onwarn,
  watch: {
    include: ['src/**', '../core/dist/**']
  }
};

// Export function to conditionally include builds based on watch mode
export default (commandLineArgs) => {
  // In watch mode, only build IIFE (faster dev iteration, no TS warnings)
  if (commandLineArgs.watch) {
    return [iifeConfig, iifeMinConfig];
  }
  // Full build: all formats
  return [esmConfig, cjsConfig, iifeConfig, iifeMinConfig];
};
