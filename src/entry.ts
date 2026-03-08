#!/usr/bin/env bun

import { existsSync } from "fs";
import { join, resolve } from "path";
import { VERSION } from "./meta";
import {
  readInstalledVersion,
  replaceInstalledTree,
  resolveInstallPaths,
} from "./install-layout";

function buildInstalledEnv(paths: ReturnType<typeof resolveInstallPaths>): NodeJS.ProcessEnv {
  return {
    ...process.env,
    BTERM_INSTALL_ROOT: paths.installRoot,
    BTERM_BIN_DIR: paths.binDir,
    BTERM_LAUNCHER_PATH: paths.launcherPath,
    BTERM_APP_ROOT: paths.appRoot,
    BTERM_INSTALL_MODE: "installed",
    BIBLETERM_DATA_DIR: paths.dataDir,
  };
}

async function main(): Promise<void> {
  const sourceRoot = resolve(import.meta.dirname, "..");
  const paths = resolveInstallPaths();
  const installedMain = join(paths.appSrc, "main.ts");
  const installedVersion = readInstalledVersion(paths);

  if (!existsSync(installedMain) || installedVersion !== VERSION) {
    replaceInstalledTree({
      sourceRoot,
      paths,
      fallbackSourceRoot: sourceRoot,
    });
  }

  const subprocess = Bun.spawn(["bun", installedMain, ...process.argv.slice(2)], {
    cwd: process.cwd(),
    env: buildInstalledEnv(paths),
    stderr: "inherit",
    stdin: "inherit",
    stdout: "inherit",
  });

  const exitCode = await subprocess.exited;
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(
    `Failed to start bterm: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
