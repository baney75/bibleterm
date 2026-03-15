import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { describe, expect, test } from "bun:test";

describe("startup health gate", () => {
  test("fails fast with repo repair instructions when no healthy translations exist in fallback mode", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "bibleterm-empty-"));

    try {
      const proc = Bun.spawnSync([process.execPath, "src/main.ts"], {
        cwd: import.meta.dir + "/..",
        env: {
          ...process.env,
          BIBLETERM_DATA_DIR: dataDir,
        },
        stderr: "pipe",
        stdout: "pipe",
      });

      const stderr = Buffer.from(proc.stderr).toString("utf8");
      const stdout = Buffer.from(proc.stdout).toString("utf8");

      expect(proc.exitCode).toBe(1);
      expect(stdout.trim()).toBe("");
      expect(stderr).toContain("No healthy Bible data found. Run: bun run download && bun run install");
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  test("fails fast with upgrade instructions when no healthy translations exist in installed mode", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "bibleterm-empty-installed-"));

    try {
      const proc = Bun.spawnSync([process.execPath, "src/main.ts"], {
        cwd: import.meta.dir + "/..",
        env: {
          ...process.env,
          BIBLETERM_DATA_DIR: dataDir,
          BTERM_INSTALL_MODE: "installed",
        },
        stderr: "pipe",
        stdout: "pipe",
      });

      const stderr = Buffer.from(proc.stderr).toString("utf8");
      const stdout = Buffer.from(proc.stdout).toString("utf8");

      expect(proc.exitCode).toBe(1);
      expect(stdout.trim()).toBe("");
      expect(stderr).toContain("No healthy Bible data found. Run: bterm upgrade");
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
