#!/usr/bin/env bun

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const SOURCE_DIR = resolve(import.meta.dirname || "", "..");
const SOURCE_SRC = join(SOURCE_DIR, "src");
const SOURCE_DATA = join(SOURCE_DIR, "data");

const HOME = process.env.HOME || process.cwd();
const BIN_DIR = join(HOME, ".local", "bin");
const APP_DIR = join(HOME, ".local", "share", "bibleterm", "app");
const APP_SRC = join(APP_DIR, "src");
const APP_DATA = join(HOME, ".local", "share", "bibleterm", "data");
const LAUNCHER = join(BIN_DIR, "bterm");

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function installLauncher(): void {
  const content = `#!/usr/bin/env bash
set -euo pipefail

APP_SRC="${HOME}/.local/share/bibleterm/app/src/main.ts"
APP_DATA="${HOME}/.local/share/bibleterm/data"
FALLBACK_SRC="${SOURCE_DIR}/src/main.ts"

if ! command -v bun >/dev/null 2>&1; then
  echo "bterm requires Bun runtime. Install Bun first: https://bun.sh" >&2
  exit 1
fi

if [[ -f "\${APP_SRC}" ]]; then
  export BIBLETERM_DATA_DIR="\${APP_DATA}"
  exec bun "\${APP_SRC}" "\$@"
fi

if [[ -f "\${FALLBACK_SRC}" ]]; then
  exec bun "\${FALLBACK_SRC}" "\$@"
fi

echo "bterm is not installed. Run: bun run scripts/install.ts" >&2
exit 1
`;

  writeFileSync(LAUNCHER, content, "utf8");
  Bun.spawnSync(["chmod", "+x", LAUNCHER]);
}

function main(): void {
  console.log("Installing bibleterm...");

  if (!existsSync(SOURCE_SRC)) {
    console.error("Missing src directory.");
    process.exit(1);
  }

  if (!existsSync(SOURCE_DATA)) {
    console.error("Missing data directory.");
    process.exit(1);
  }

  ensureDir(BIN_DIR);
  ensureDir(APP_DIR);
  rmSync(APP_SRC, { recursive: true, force: true });
  rmSync(APP_DATA, { recursive: true, force: true });

  cpSync(SOURCE_SRC, APP_SRC, { recursive: true, force: true });
  cpSync(SOURCE_DATA, APP_DATA, { recursive: true, force: true });
  installLauncher();

  console.log("Installed:");
  console.log(`  launcher: ${LAUNCHER}`);
  console.log(`  app src:  ${APP_SRC}`);
  console.log(`  data:     ${APP_DATA}`);
  console.log("Done. Run: bterm");
}

main();
