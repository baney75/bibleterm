#!/usr/bin/env bun

import { existsSync } from "fs";
import { join, resolve } from "path";
import { replaceInstalledTree, resolveInstallPaths } from "../src/install-layout";
import { DEFAULT_UPGRADE_COMMAND } from "../src/meta";

const SOURCE_DIR = resolve(import.meta.dirname || "", "..");

function main(): void {
  console.log("Installing bibleterm...");

  if (!existsSync(join(SOURCE_DIR, "src"))) {
    console.error("Missing src directory.");
    process.exit(1);
  }

  if (!existsSync(join(SOURCE_DIR, "data"))) {
    console.error("Missing data directory.");
    process.exit(1);
  }

  const paths = resolveInstallPaths();
  replaceInstalledTree({
    fallbackSourceRoot: SOURCE_DIR,
    paths,
    sourceRoot: SOURCE_DIR,
  });

  console.log("Installed:");
  console.log(`  launcher: ${paths.launcherPath}`);
  console.log(`  app src:  ${paths.appSrc}`);
  console.log(`  data:     ${paths.dataDir}`);
  console.log(`Update later: ${DEFAULT_UPGRADE_COMMAND}`);
  console.log("Done. Run: bterm");
}

main();
