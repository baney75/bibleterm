import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, test } from "bun:test";

describe("cli upgrade command", () => {
  test("help documents bterm upgrade", () => {
    const proc = Bun.spawnSync(["bun", "src/main.ts", "--help"], {
      cwd: import.meta.dir + "/..",
      stderr: "pipe",
      stdout: "pipe",
    });

    const stdout = Buffer.from(proc.stdout).toString("utf8");
    expect(proc.exitCode).toBe(0);
    expect(stdout).toContain("bterm upgrade");
  });

  test("upgrade runs before TTY initialization", () => {
    const installRoot = mkdtempSync(join(tmpdir(), "bterm-cli-upgrade-"));

    try {
      const installProc = Bun.spawnSync(["bun", "scripts/install.ts"], {
        cwd: import.meta.dir + "/..",
        env: {
          ...process.env,
          BTERM_INSTALL_ROOT: installRoot,
        },
        stderr: "pipe",
        stdout: "pipe",
      });

      expect(installProc.exitCode).toBe(0);

      const proc = Bun.spawnSync(["bun", "src/main.ts", "upgrade"], {
        cwd: import.meta.dir + "/..",
        env: {
          ...process.env,
          BTERM_GITHUB_RELEASE_API_URL: "http://127.0.0.1:9/nope",
          BTERM_INSTALL_ROOT: installRoot,
        },
        stderr: "pipe",
        stdout: "pipe",
      });

      const stderr = Buffer.from(proc.stderr).toString("utf8");
      expect(stderr).not.toContain("interactive terminal");
      expect(proc.exitCode).toBe(1);
    } finally {
      rmSync(installRoot, { recursive: true, force: true });
    }
  });
});
