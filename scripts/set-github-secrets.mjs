#!/usr/bin/env node
/**
 * Set GitHub Actions secrets for NimbusAI deployment.
 * Reads credentials from .env.local and pushes them to GitHub.
 *
 * Usage:
 *   node scripts/set-github-secrets.mjs <GITHUB_PAT>
 *
 * Requires: npm install tweetsodium (or uses built-in crypto)
 */

import { readFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Parse .env.local
function parseEnv(filePath) {
  const content = readFileSync(filePath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = value;
  }
  return env;
}

// Encrypt secret using libsodium (tweetsodium)
async function encryptSecret(publicKeyB64, secretValue) {
  // Use tweetsodium if available, otherwise use Web Crypto API workaround
  try {
    const sodium = require("tweetsodium");
    const key = Buffer.from(publicKeyB64, "base64");
    const messageBytes = Buffer.from(secretValue);
    const encryptedBytes = sodium.seal(messageBytes, key);
    return Buffer.from(encryptedBytes).toString("base64");
  } catch {
    // Fallback: try libsodium-wrappers
    try {
      const sodium = require("libsodium-wrappers");
      await sodium.ready;
      const key = sodium.from_base64(publicKeyB64, sodium.base64_variants.ORIGINAL);
      const msg = sodium.from_string(secretValue);
      const encrypted = sodium.crypto_box_seal(msg, key);
      return sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL);
    } catch {
      throw new Error(
        "No encryption library found. Run: npm install tweetsodium\n" +
        "Or: npm install libsodium-wrappers"
      );
    }
  }
}

async function getRepoPublicKey(owner, repo, token) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  if (!res.ok) throw new Error(`Failed to get public key: ${res.status} ${await res.text()}`);
  return res.json();
}

async function setSecret(owner, repo, token, keyId, publicKey, name, value) {
  const encrypted = await encryptSecret(publicKey, value);
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/secrets/${name}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ encrypted_value: encrypted, key_id: keyId }),
    }
  );
  if (res.status === 201 || res.status === 204) {
    console.log(`  ✓ ${name}`);
  } else {
    console.log(`  ✗ ${name}: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  const token = process.argv[2];
  if (!token) {
    console.error("Usage: node scripts/set-github-secrets.mjs <GITHUB_PAT>");
    process.exit(1);
  }

  const owner = "cloudblurr";
  const repo = "NimbusAI";

  const env = parseEnv(".env.local");

  const secrets = {
    CLOUDFLARE_ACCOUNT_ID:                  env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_CONTAINER_API_ACCOUNT_TOKEN: env.CLOUDFLARE_CONTAINER_API_ACCOUNT_TOKEN,
    CLOUDFLARE_ACCOUNT_API:                 env.CLOUDFLARE_ACCOUNT_API,
    NEXTAUTH_SECRET:                        env.NEXTAUTH_SECRET,
    DATABASE_URL:                           env.DATABASE_URL,
    DIGITAL_OCEAN_API_TOKEN:                env.DIGITAL_OCEAN_API_TOKEN,
    DIGITAL_OCEAN_AI_ENDPOINT:              env.DIGITAL_OCEAN_AI_ENDPOINT,
    DO_INFERENCE_API_TOKEN:                 env.DIGITAL_OCEAN_API_TOKEN,
    GOOGLE_CLIENT_ID:                       env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET:                   env.GOOGLE_CLIENT_SECRET,
    NEXTAUTH_URL:                           "https://sol.terragravity.cloud",
  };

  console.log(`\nSetting ${Object.keys(secrets).length} secrets for ${owner}/${repo}...`);

  const { key_id, key } = await getRepoPublicKey(owner, repo, token);

  for (const [name, value] of Object.entries(secrets)) {
    if (value) {
      await setSecret(owner, repo, token, key_id, key, name, value);
    } else {
      console.log(`  - ${name}: skipped (empty)`);
    }
  }

  console.log("\n✅ Secrets set! Triggering deployment...");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
