#!/usr/bin/env python3
"""
Generate self-signed SSL certificates for local HTTPS development.

This allows testing getUserMedia() (microphone) which requires a secure context.

Usage:
    python3 scripts/generate-certs.py
"""

import subprocess
from pathlib import Path

CERT_DIR = Path(__file__).parent / ".certs"
CERT_FILE = CERT_DIR / "cert.pem"
KEY_FILE = CERT_DIR / "key.pem"


def generate_self_signed_cert():
    """Generate a self-signed certificate for local HTTPS testing."""
    CERT_DIR.mkdir(parents=True, exist_ok=True)

    if CERT_FILE.exists() and KEY_FILE.exists():
        print(f"✓ Certificates already exist: {CERT_DIR}")
        return

    print("Generating self-signed certificate...")

    # Generate certificate valid for localhost and common dev hostnames
    subprocess.run(
        [
            "openssl",
            "req",
            "-x509",
            "-newkey",
            "rsa:4096",
            "-keyout",
            str(KEY_FILE),
            "-out",
            str(CERT_FILE),
            "-days",
            "365",
            "-nodes",
            "-subj",
            "/CN=localhost",
            "-addext",
            "subjectAltName=DNS:localhost,DNS:speechos,DNS:*.local,IP:127.0.0.1",
        ],
        check=True,
    )

    print(f"✓ Certificate generated: {CERT_FILE}")
    print(f"✓ Key generated: {KEY_FILE}")


if __name__ == "__main__":
    generate_self_signed_cert()
