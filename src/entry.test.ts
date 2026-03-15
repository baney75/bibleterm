import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";

describe("published entry bootstrap", () => {
  test("bootstraps the installed tree and runs doctor", () => {
    const root = mkdtempSync(join(tmpdir(), "bterm-entry-"));
    const installRoot = join(root, "install");

    try {
      const result = Bun.spawnSync([process.execPath, "src/entry.ts", "--doctor"], {
        cwd: resolve(import.meta.dirname, ".."),
        env: {
          ...process.env,
          BTERM_INSTALL_ROOT: installRoot,
          BTERM_BIN_DIR: join(installRoot, "bin"),
        },
        stderr: "pipe",
        stdout: "pipe",
      });

      expect(result.exitCode).toBe(0);
      const stdout = result.stdout.toString();
      expect(stdout).toContain("installed: ASV, KJV");
      expect(stdout).toContain("status: ok");
      expect(existsSync(join(installRoot, "app", "src", "main.ts"))).toBe(true);
      expect(existsSync(join(installRoot, "data", "en-asv"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
