#!/usr/bin/env node
/**
 * Generate self-signed SSL certificates for local HTTPS development.
 * This allows testing getUserMedia() (microphone) which requires a secure context.
 *
 * Usage: node scripts/generate-certs.js
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CERT_DIR = join(__dirname, ".certs");
const CERT_FILE = join(CERT_DIR, "cert.pem");
const KEY_FILE = join(CERT_DIR, "key.pem");

function generateCerts() {
  if (!existsSync(CERT_DIR)) {
    mkdirSync(CERT_DIR, { recursive: true });
  }

  if (existsSync(CERT_FILE) && existsSync(KEY_FILE)) {
    console.log(`✓ Certificates already exist: ${CERT_DIR}`);
    return;
  }

  console.log("Generating self-signed certificate...");

  execSync(
    `openssl req -x509 -newkey rsa:4096 \
      -keyout "${KEY_FILE}" \
      -out "${CERT_FILE}" \
      -days 365 \
      -nodes \
      -subj "/CN=localhost" \
      -addext "subjectAltName=DNS:localhost,DNS:speechos,DNS:*.local,IP:127.0.0.1"`,
    { stdio: "inherit" }
  );

  console.log(`✓ Certificate generated: ${CERT_FILE}`);
  console.log(`✓ Key generated: ${KEY_FILE}`);
}

generateCerts();
