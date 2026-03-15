import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { describe, expect, test } from "bun:test";

const REPO_DATA_DIR = resolve(import.meta.dir, "..", "data");

function createDoctorFixtureDataDir(): string {
  const dataDir = mkdtempSync(join(tmpdir(), "bibleterm-doctor-"));
  cpSync(join(REPO_DATA_DIR, "en-asv"), join(dataDir, "en-asv"), { recursive: true });

  const chapterDir = join(dataDir, "en-kjv", "john");
  mkdirSync(chapterDir, { recursive: true });
  writeFileSync(
    join(chapterDir, "3.json"),
    JSON.stringify(
      {
        data: [
          { book: "John", chapter: "3", verse: "1", text: "first" },
          { book: "John", chapter: "3", verse: "1", text: "duplicate" },
        ],
      },
      null,
      2
    )
  );

  return dataDir;
}

describe("doctor command", () => {
  test("reports shipped ASV and KJV as healthy", () => {
    const proc = Bun.spawnSync([process.execPath, "src/main.ts", "--doctor"], {
      cwd: import.meta.dir + "/..",
      env: {
        ...process.env,
        BIBLETERM_DATA_DIR: REPO_DATA_DIR,
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    const stdout = Buffer.from(proc.stdout).toString("utf8");
    const stderr = Buffer.from(proc.stderr).toString("utf8");

    expect(proc.exitCode).toBe(0);
    expect(stderr.trim()).toBe("");
    expect(stdout).toContain("installed: ASV, KJV");
    expect(stdout).toContain("ASV: ok (66 books, 1189 chapters, 31103 verses)");
    expect(stdout).toContain("KJV: ok (66 books, 1189 chapters, 31103 verses)");
    expect(stdout).toContain("healthy: ASV, KJV");
    expect(stdout).toContain("status: ok");
  });

  test("reports mixed translation health and exits non-zero", () => {
    const dataDir = createDoctorFixtureDataDir();

    try {
      const proc = Bun.spawnSync([process.execPath, "src/main.ts", "--doctor"], {
        cwd: import.meta.dir + "/..",
        env: {
          ...process.env,
          BIBLETERM_DATA_DIR: dataDir,
        },
        stderr: "pipe",
        stdout: "pipe",
      });

      const stdout = Buffer.from(proc.stdout).toString("utf8");
      const stderr = Buffer.from(proc.stderr).toString("utf8");

      expect(proc.exitCode).toBe(1);
      expect(stderr.trim()).toBe("");
      expect(stdout).toContain("installed: ASV, KJV");
      expect(stdout).toContain("ASV: ok (66 books, 1189 chapters, 31103 verses)");
      expect(stdout).toContain("KJV: invalid");
      expect(stdout).toContain("healthy: ASV");
      expect(stdout).toContain("status: error");
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
