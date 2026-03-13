import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "fs";
import { join, resolve } from "path";

export interface InstallPaths {
  appPackageJson: string;
  appRoot: string;
  appSrc: string;
  binDir: string;
  dataDir: string;
  installRoot: string;
  launcherPath: string;
}

export interface ReplaceInstalledTreeOptions {
  fallbackSourceRoot?: string;
  paths: InstallPaths;
  sourceRoot: string;
}

export interface WriteLauncherOptions {
  fallbackSourceRoot?: string;
}

function escapeShellValue(value: string): string {
  return value.replace(/(["$`\\])/g, "\\$1");
}

function validateSourceTree(sourceRoot: string): void {
  const sourceSrc = join(sourceRoot, "src");
  const sourceData = join(sourceRoot, "data");
  const sourcePackage = join(sourceRoot, "package.json");

  if (!existsSync(sourceSrc)) {
    throw new Error(`Missing src directory in install source: ${sourceSrc}`);
  }

  if (!existsSync(sourceData)) {
    throw new Error(`Missing data directory in install source: ${sourceData}`);
  }

  if (!existsSync(sourcePackage)) {
    throw new Error(`Missing package.json in install source: ${sourcePackage}`);
  }
}

export function resolveInstallPaths(env: NodeJS.ProcessEnv = process.env): InstallPaths {
  const home = env.HOME || process.cwd();
  const installRootOverride = env.BTERM_INSTALL_ROOT ? resolve(env.BTERM_INSTALL_ROOT) : null;
  const installRoot = installRootOverride || resolve(home, ".local", "share", "bibleterm");
  const binDir = env.BTERM_BIN_DIR
    ? resolve(env.BTERM_BIN_DIR)
    : installRootOverride
      ? join(installRoot, "bin")
      : resolve(home, ".local", "bin");
  const appRoot = join(installRoot, "app");

  return {
    appPackageJson: join(appRoot, "package.json"),
    appRoot,
    appSrc: join(appRoot, "src"),
    binDir,
    dataDir: join(installRoot, "data"),
    installRoot,
    launcherPath: join(binDir, "bterm"),
  };
}

export function ensureInstallDirs(paths: InstallPaths): void {
  mkdirSync(paths.binDir, { recursive: true });
  mkdirSync(paths.installRoot, { recursive: true });
}

export function readInstalledVersion(paths: InstallPaths): string | null {
  if (!existsSync(paths.appPackageJson)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(paths.appPackageJson, "utf8")) as { version?: unknown };
    return typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    return null;
  }
}

export function writeLauncher(
  paths: InstallPaths,
  options: WriteLauncherOptions = {}
): void {
  const fallbackRoot = options.fallbackSourceRoot ? resolve(options.fallbackSourceRoot) : "";
  const fallbackSrc = fallbackRoot ? join(fallbackRoot, "src", "main.ts") : "";
  const fallbackData = fallbackRoot ? join(fallbackRoot, "data") : "";
  const content = `#!/usr/bin/env bash
set -euo pipefail

INSTALL_ROOT="${escapeShellValue(paths.installRoot)}"
BIN_DIR="${escapeShellValue(paths.binDir)}"
LAUNCHER_PATH="${escapeShellValue(paths.launcherPath)}"
APP_ROOT="${escapeShellValue(paths.appRoot)}"
APP_SRC="${escapeShellValue(join(paths.appSrc, "main.ts"))}"
APP_DATA="${escapeShellValue(paths.dataDir)}"
FALLBACK_ROOT="${escapeShellValue(fallbackRoot)}"
FALLBACK_SRC="${escapeShellValue(fallbackSrc)}"
FALLBACK_DATA="${escapeShellValue(fallbackData)}"

if ! command -v bun >/dev/null 2>&1; then
  echo "bterm requires Bun runtime. Install Bun first: https://bun.sh" >&2
  exit 1
fi

if [[ -f "\${APP_SRC}" ]]; then
  export BTERM_INSTALL_ROOT="\${INSTALL_ROOT}"
  export BTERM_BIN_DIR="\${BIN_DIR}"
  export BTERM_LAUNCHER_PATH="\${LAUNCHER_PATH}"
  export BTERM_APP_ROOT="\${APP_ROOT}"
  export BTERM_INSTALL_MODE="installed"
  export BIBLETERM_DATA_DIR="\${APP_DATA}"
  exec bun "\${APP_SRC}" "\$@"
fi

if [[ -n "\${FALLBACK_SRC}" && -f "\${FALLBACK_SRC}" ]]; then
  export BTERM_INSTALL_ROOT="\${INSTALL_ROOT}"
  export BTERM_BIN_DIR="\${BIN_DIR}"
  export BTERM_LAUNCHER_PATH="\${LAUNCHER_PATH}"
  export BTERM_APP_ROOT="\${FALLBACK_ROOT}"
  export BTERM_INSTALL_MODE="fallback"
  if [[ -d "\${FALLBACK_DATA}" ]]; then
    export BIBLETERM_DATA_DIR="\${FALLBACK_DATA}"
  fi
  exec bun "\${FALLBACK_SRC}" "\$@"
fi

echo "bterm is not installed. Run: bun run scripts/install.ts" >&2
exit 1
`;

  writeFileSync(paths.launcherPath, content, "utf8");
  chmodSync(paths.launcherPath, 0o755);
}

export function replaceInstalledTree(options: ReplaceInstalledTreeOptions): void {
  const sourceRoot = resolve(options.sourceRoot);
  const paths = options.paths;

  validateSourceTree(sourceRoot);
  ensureInstallDirs(paths);

  const stageRoot = mkdtempSync(join(paths.installRoot, ".staging-"));
  const stagedAppRoot = join(stageRoot, "app");
  const stagedDataDir = join(stageRoot, "data");

  try {
    cpSync(join(sourceRoot, "src"), join(stagedAppRoot, "src"), {
      recursive: true,
      force: true,
    });
    cpSync(join(sourceRoot, "data"), stagedDataDir, {
      recursive: true,
      force: true,
    });
    cpSync(join(sourceRoot, "package.json"), join(stagedAppRoot, "package.json"), {
      force: true,
    });

    rmSync(paths.appRoot, { recursive: true, force: true });
    rmSync(paths.dataDir, { recursive: true, force: true });

    renameSync(stagedAppRoot, paths.appRoot);
    renameSync(stagedDataDir, paths.dataDir);
    writeLauncher(paths, { fallbackSourceRoot: options.fallbackSourceRoot });
  } finally {
    rmSync(stageRoot, { recursive: true, force: true });
  }
}
