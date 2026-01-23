import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

// Use existing self-signed certs from the HTTPS server script
const certPath = resolve(__dirname, "../scripts/.certs/cert.pem");
const keyPath = resolve(__dirname, "../scripts/.certs/key.pem");
const certsExist = existsSync(certPath) && existsSync(keyPath);
const useHttp = process.env.VITE_HTTP === "true";

if (!certsExist && !useHttp) {
  console.warn("\n⚠️  No SSL certificates found.");
  console.warn('   Run "npm run generate-certs" first to generate them.\n');
}

// Plugin for custom routing
const routingPlugin = () => ({
  name: "routing",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // Redirect old /test path to root for backwards compatibility
      if (req.url === "/test" || req.url === "/test/") {
        res.writeHead(301, { Location: "/" });
        res.end();
        return;
      }
      // Rewrite /packages/ requests to serve from parent folder
      if (req.url?.startsWith("/packages/")) {
        req.url = "/../" + req.url;
      }
      // Clean URLs for demo pages
      if (req.url === "/demo-dictation") {
        req.url = "/demo-dictation.html";
      }
      if (req.url === "/demo-lights") {
        req.url = "/demo-lights.html";
      }
      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), routingPlugin()],
  // Root is the test/ folder so the app is served at /
  root: __dirname,
  resolve: {
    alias: {
      // Point to local dist folders to test built output
      "@speechos/core": resolve(__dirname, "../packages/core/dist/index.js"),
      "@speechos/client": resolve(
        __dirname,
        "../packages/client/dist/index.js"
      ),
      "@speechos/react": resolve(__dirname, "../packages/react/dist/index.js"),
    },
    // Ensure single instances of Lit to avoid custom element registration issues
    dedupe: ["lit", "lit-html", "lit-element", "@lit/reactive-element"],
  },
  server: {
    host: "0.0.0.0", // Allow connections from all hosts
    allowedHosts: [".ngrok-free.app", ".ngrok.io", "localhost"], // Allow ngrok and other tunnels
    port: useHttp ? 8080 : 8443,
    open: false, // Don't auto-open browser
    https:
      certsExist && !useHttp
        ? {
            cert: readFileSync(certPath),
            key: readFileSync(keyPath),
          }
        : undefined, // HTTP fallback if no certs or VITE_HTTP=true (audio won't work)
    hmr: true, // Enable HMR for all hosts
    fs: {
      // Allow serving files from parent folder (packages/)
      allow: [resolve(__dirname, "..")],
    },
  },
  optimizeDeps: {
    // Pre-bundle dependencies that the dist files import
    include: ["lit", "livekit-client", "lucide", "react", "react-dom/client"],
  },
});
