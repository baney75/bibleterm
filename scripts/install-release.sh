#!/usr/bin/env bash

set -euo pipefail

OWNER="baney75"
REPO="bibleterm"
API_URL="https://api.github.com/repos/${OWNER}/${REPO}/releases/latest"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

require_command bun
require_command curl
require_command tar
require_command mktemp

tmpdir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmpdir"
}
trap cleanup EXIT

printf 'Fetching latest release metadata...\n'
release_json="$(curl -fsSL "$API_URL")"

tag_name="$(
  printf '%s' "$release_json" | bun -e '
    const input = await new Response(Bun.stdin.stream()).text();
    const json = JSON.parse(input);
    if (!json.tag_name) {
      console.error("Latest GitHub release is missing tag_name.");
      process.exit(1);
    }
    process.stdout.write(json.tag_name);
  '
)"

tarball_url="$(
  printf '%s' "$release_json" | bun -e '
    const input = await new Response(Bun.stdin.stream()).text();
    const json = JSON.parse(input);
    if (!json.tarball_url) {
      console.error("Latest GitHub release is missing tarball_url.");
      process.exit(1);
    }
    process.stdout.write(json.tarball_url);
  '
)"

printf 'Downloading %s...\n' "$tag_name"
curl -fsSL "$tarball_url" -o "$tmpdir/release.tgz"

printf 'Extracting release...\n'
tar -xzf "$tmpdir/release.tgz" -C "$tmpdir"

release_root="$(find "$tmpdir" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
if [ -z "$release_root" ] || [ ! -d "$release_root" ]; then
  printf 'Failed to locate extracted release contents.\n' >&2
  exit 1
fi

if [ ! -f "$release_root/scripts/install.ts" ]; then
  printf 'Release is missing scripts/install.ts.\n' >&2
  exit 1
fi

printf 'Installing bterm...\n'
(
  cd "$release_root"
  bun run scripts/install.ts
)

printf '\nInstalled %s.\n' "$tag_name"
printf 'Run: bterm --doctor\n'
printf 'Then: bterm\n'
