#!/usr/bin/env python3
"""
Set GitHub Actions secrets for NimbusAI deployment.
Reads credentials from .env.local and pushes them to GitHub.

Usage:
    pip install PyNaCl requests python-dotenv
    python scripts/set-github-secrets.py --token YOUR_GITHUB_PAT
"""

import argparse
import base64
import os
import sys
from pathlib import Path

try:
    import requests
    from nacl import encoding, public
    from dotenv import dotenv_values
except ImportError:
    print("Missing dependencies. Run:")
    print("  pip install PyNaCl requests python-dotenv")
    sys.exit(1)


def encrypt_secret(public_key_b64: str, secret_value: str) -> str:
    """Encrypt a secret using the repo's public key (libsodium sealed box)."""
    public_key = public.PublicKey(public_key_b64.encode("utf-8"), encoding.Base64Encoder())
    sealed_box = public.SealedBox(public_key)
    encrypted = sealed_box.encrypt(secret_value.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")


def get_repo_public_key(owner: str, repo: str, token: str) -> tuple[str, str]:
    """Fetch the repo's public key for secret encryption."""
    url = f"https://api.github.com/repos/{owner}/{repo}/actions/secrets/public-key"
    resp = requests.get(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    resp.raise_for_status()
    data = resp.json()
    return data["key_id"], data["key"]


def set_secret(owner: str, repo: str, token: str, key_id: str, public_key: str, name: str, value: str):
    """Create or update a GitHub Actions secret."""
    encrypted = encrypt_secret(public_key, value)
    url = f"https://api.github.com/repos/{owner}/{repo}/actions/secrets/{name}"
    resp = requests.put(url, json={
        "encrypted_value": encrypted,
        "key_id": key_id,
    }, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    if resp.status_code in (201, 204):
        print(f"  ✓ {name}")
    else:
        print(f"  ✗ {name}: {resp.status_code} {resp.text}")


def main():
    parser = argparse.ArgumentParser(description="Set GitHub Actions secrets from .env.local")
    parser.add_argument("--token", required=True, help="GitHub Personal Access Token (repo scope)")
    parser.add_argument("--owner", default="cloudblurr", help="GitHub owner/org")
    parser.add_argument("--repo", default="NimbusAI", help="GitHub repository name")
    parser.add_argument("--env-file", default=".env.local", help="Path to .env file")
    args = parser.parse_args()

    # Load env vars
    env_path = Path(args.env_file)
    if not env_path.exists():
        print(f"Error: {env_path} not found")
        sys.exit(1)

    env = dotenv_values(env_path)

    # Secrets to push to GitHub
    secrets_to_set = {
        "CLOUDFLARE_ACCOUNT_ID":                    env.get("CLOUDFLARE_ACCOUNT_ID", ""),
        "CLOUDFLARE_CONTAINER_API_ACCOUNT_TOKEN":   env.get("CLOUDFLARE_CONTAINER_API_ACCOUNT_TOKEN", ""),
        "CLOUDFLARE_ACCOUNT_API":                   env.get("CLOUDFLARE_ACCOUNT_API", ""),
        "NEXTAUTH_SECRET":                          env.get("NEXTAUTH_SECRET", ""),
        "DATABASE_URL":                             env.get("DATABASE_URL", ""),
        "DIGITAL_OCEAN_API_TOKEN":                  env.get("DIGITAL_OCEAN_API_TOKEN", ""),
        "DIGITAL_OCEAN_AI_ENDPOINT":                env.get("DIGITAL_OCEAN_AI_ENDPOINT", ""),
        "DO_INFERENCE_API_TOKEN":                   env.get("DO_INFERENCE_API_TOKEN", env.get("DIGITAL_OCEAN_API_TOKEN", "")),
        "GOOGLE_CLIENT_ID":                         env.get("GOOGLE_CLIENT_ID", ""),
        "GOOGLE_CLIENT_SECRET":                     env.get("GOOGLE_CLIENT_SECRET", ""),
    }

    print(f"\nSetting secrets for {args.owner}/{args.repo}...")
    key_id, public_key = get_repo_public_key(args.owner, args.repo, args.token)

    for name, value in secrets_to_set.items():
        if value:
            set_secret(args.owner, args.repo, args.token, key_id, public_key, name, value)
        else:
            print(f"  - {name}: skipped (empty)")

    print("\nDone! Trigger a deployment with:")
    print("  git commit --allow-empty -m 'trigger deploy' && git push origin main")


if __name__ == "__main__":
    main()
