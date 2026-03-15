import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, test } from "bun:test";

describe("install layout", () => {
  test("install writes a launcher with install env and copies package metadata", () => {
    const root = join(tmpdir(), `bterm-install-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    mkdirSync(root, { recursive: true });

    try {
      const proc = Bun.spawnSync([process.execPath, "scripts/install.ts"], {
        cwd: import.meta.dir + "/..",
        env: {
          ...process.env,
          BTERM_INSTALL_ROOT: root,
        },
        stderr: "pipe",
        stdout: "pipe",
      });

      expect(proc.exitCode).toBe(0);
      expect(existsSync(join(root, "app", "package.json"))).toBe(true);
      expect(existsSync(join(root, "data", "en-asv"))).toBe(true);
      expect(existsSync(join(root, "bin", "bterm"))).toBe(true);

      const launcher = readFileSync(join(root, "bin", "bterm"), "utf8");
      expect(launcher).toContain('export BTERM_INSTALL_MODE="installed"');
      expect(launcher).toContain('export BTERM_INSTALL_ROOT=');
      expect(launcher).toContain('export BTERM_APP_ROOT=');
      expect(launcher).toContain('export BIBLETERM_DATA_DIR=');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("install replaces stale translation data instead of merging it", () => {
    const root = join(tmpdir(), `bterm-install-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    mkdirSync(join(root, "data", "en-web", "john"), { recursive: true });
    writeFileSync(join(root, "data", "en-web", "john", "3.json"), '{"data":[]}');

    try {
      const proc = Bun.spawnSync([process.execPath, "scripts/install.ts"], {
        cwd: import.meta.dir + "/..",
        env: {
          ...process.env,
          BTERM_INSTALL_ROOT: root,
        },
        stderr: "pipe",
        stdout: "pipe",
      });

      expect(proc.exitCode).toBe(0);
      expect(existsSync(join(root, "data", "en-web"))).toBe(false);
      expect(existsSync(join(root, "data", "en-kjv"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
