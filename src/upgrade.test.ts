import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { VERSION } from "./meta";
import { validateReleaseTree } from "./upgrade";

const REPO_ROOT = resolve(import.meta.dir, "..");
const UPGRADE_TEST_VERSION = VERSION.replace(/\.(\d+)$/, (_, patch) => `.${Number(patch) + 1}`);

let fixtureRoot = "";
let validArchivePath = "";
let invalidArchivePath = "";

function createTarball(sourceRoot: string, archivePath: string): void {
  const result = Bun.spawnSync(["tar", "-czf", archivePath, "-C", sourceRoot, "."], {
    stderr: "pipe",
    stdout: "ignore",
  });

  if (result.exitCode !== 0) {
    throw new Error(Buffer.from(result.stderr).toString("utf8"));
  }
}

function startReleaseServer(config: {
  invalid?: boolean;
  malformed?: boolean;
  releaseStatus?: number;
  tagName?: string;
  tarballStatus?: number;
}) {
  const server = Bun.serve({
    port: 0,
    fetch(request): Response {
      const url = new URL(request.url);

      if (url.pathname === "/releases/latest") {
        if (config.malformed) {
          return new Response(JSON.stringify({ nope: true }), {
            headers: { "content-type": "application/json" },
            status: config.releaseStatus || 200,
          });
        }

        return new Response(
          JSON.stringify({
            tag_name: config.tagName || `v${VERSION}`,
            tarball_url: `${url.origin}/${config.invalid ? "invalid.tgz" : "valid.tgz"}`,
          }),
          {
            headers: { "content-type": "application/json" },
            status: config.releaseStatus || 200,
          }
        );
      }

      if (url.pathname === "/valid.tgz") {
        if ((request.headers.get("accept") || "").includes("application/octet-stream")) {
          return new Response("unsupported media type", { status: 415 });
        }

        if ((config.tarballStatus || 200) !== 200) {
          return new Response("download failed", { status: config.tarballStatus });
        }

        return new Response(Bun.file(validArchivePath), {
          headers: { "content-type": "application/gzip" },
        });
      }

      if (url.pathname === "/invalid.tgz") {
        return new Response(Bun.file(invalidArchivePath), {
          headers: { "content-type": "application/gzip" },
        });
      }

      return new Response("not found", { status: 404 });
    },
  });

  return server;
}

async function runUpgradeProcess(envOverrides: Record<string, string>): Promise<{
  exitCode: number;
  stderr: string;
  stdout: string;
}> {
  const script = `
    import { runUpgrade } from "./src/upgrade";
    try {
      const result = await runUpgrade();
      console.log(JSON.stringify(result));
      process.exit(0);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  `;
  const proc = Bun.spawn(["bun", "-e", script], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ...envOverrides,
    },
    stderr: "pipe",
    stdout: "pipe",
  });

  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  return {
    exitCode,
    stderr,
    stdout,
  };
}

function installToRoot(installRoot: string): void {
  const proc = Bun.spawnSync(["bun", "scripts/install.ts"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      BTERM_INSTALL_ROOT: installRoot,
    },
    stderr: "pipe",
    stdout: "pipe",
  });

  if (proc.exitCode !== 0) {
    throw new Error(Buffer.from(proc.stderr).toString("utf8"));
  }
}

beforeAll(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), "bterm-upgrade-fixtures-"));

  const validRoot = join(fixtureRoot, "valid", "release");
  mkdirSync(validRoot, { recursive: true });
  cpSync(join(REPO_ROOT, "src"), join(validRoot, "src"), { recursive: true });
  cpSync(join(REPO_ROOT, "data"), join(validRoot, "data"), { recursive: true });
  cpSync(join(REPO_ROOT, "package.json"), join(validRoot, "package.json"));
  validArchivePath = join(fixtureRoot, "valid-release.tgz");
  createTarball(join(fixtureRoot, "valid"), validArchivePath);

  const invalidRoot = join(fixtureRoot, "invalid", "release");
  mkdirSync(join(invalidRoot, "src"), { recursive: true });
  writeFileSync(join(invalidRoot, "src", "main.ts"), 'console.log("broken");\n');
    writeFileSync(
      join(invalidRoot, "package.json"),
      JSON.stringify({ name: "bibleterm", version: UPGRADE_TEST_VERSION }, null, 2)
    );
  invalidArchivePath = join(fixtureRoot, "invalid-release.tgz");
  createTarball(join(fixtureRoot, "invalid"), invalidArchivePath);
});

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true });
});

describe("upgrade flow", () => {
  test("validateReleaseTree rejects incomplete releases", () => {
    expect(() => validateReleaseTree(join(fixtureRoot, "invalid", "release"))).toThrow(
      "Release archive is missing required path: data"
    );
  });

  test("installs from a release tarball into a clean install root", async () => {
    const installRoot = mkdtempSync(join(tmpdir(), "bterm-upgrade-install-"));
    mkdirSync(join(installRoot, "data", "en-web"), { recursive: true });

    const server = startReleaseServer({});

    try {
      const proc = await runUpgradeProcess({
        BTERM_GITHUB_RELEASE_API_URL: `${server.url}releases/latest`,
        BTERM_INSTALL_ROOT: installRoot,
      });

      expect(proc.exitCode).toBe(0);
      expect(JSON.parse(proc.stdout).updated).toBe(true);
      expect(existsSync(join(installRoot, "app", "package.json"))).toBe(true);
      expect(existsSync(join(installRoot, "data", "en-asv"))).toBe(true);
      expect(existsSync(join(installRoot, "data", "en-kjv"))).toBe(true);
      expect(existsSync(join(installRoot, "data", "en-web"))).toBe(false);
    } finally {
      server.stop(true);
      rmSync(installRoot, { recursive: true, force: true });
    }
  });

  test("returns already up to date when installed version matches latest release", async () => {
    const installRoot = mkdtempSync(join(tmpdir(), "bterm-upgrade-current-"));
    installToRoot(installRoot);
    const server = startReleaseServer({});

    try {
      const proc = await runUpgradeProcess({
        BTERM_GITHUB_RELEASE_API_URL: `${server.url}releases/latest`,
        BTERM_INSTALL_ROOT: installRoot,
      });

      expect(proc.exitCode).toBe(0);
      expect(JSON.parse(proc.stdout).message).toContain("Already up to date");
    } finally {
      server.stop(true);
      rmSync(installRoot, { recursive: true, force: true });
    }
  });

  test("rejects malformed GitHub release responses", async () => {
    const installRoot = mkdtempSync(join(tmpdir(), "bterm-upgrade-malformed-"));
    const server = startReleaseServer({ malformed: true });

    try {
      const proc = await runUpgradeProcess({
        BTERM_GITHUB_RELEASE_API_URL: `${server.url}releases/latest`,
        BTERM_INSTALL_ROOT: installRoot,
      });

      expect(proc.exitCode).toBe(1);
      expect(proc.stderr).toContain("GitHub release metadata was malformed.");
    } finally {
      server.stop(true);
      rmSync(installRoot, { recursive: true, force: true });
    }
  });

  test("leaves the current install untouched when download fails", async () => {
    const installRoot = mkdtempSync(join(tmpdir(), "bterm-upgrade-download-fail-"));
    installToRoot(installRoot);
    const beforePackage = readFileSync(join(installRoot, "app", "package.json"), "utf8");
    const server = startReleaseServer({
      tagName: `v${UPGRADE_TEST_VERSION}`,
      tarballStatus: 500,
    });

    try {
      const proc = await runUpgradeProcess({
        BTERM_GITHUB_RELEASE_API_URL: `${server.url}releases/latest`,
        BTERM_INSTALL_ROOT: installRoot,
      });

      expect(proc.exitCode).toBe(1);
      expect(proc.stderr).toContain("Release download failed with HTTP 500.");
      expect(readFileSync(join(installRoot, "app", "package.json"), "utf8")).toBe(beforePackage);
    } finally {
      server.stop(true);
      rmSync(installRoot, { recursive: true, force: true });
    }
  });

  test("leaves the current install untouched when the archive is missing required files", async () => {
    const installRoot = mkdtempSync(join(tmpdir(), "bterm-upgrade-invalid-"));
    installToRoot(installRoot);
    const beforePackage = readFileSync(join(installRoot, "app", "package.json"), "utf8");
    const server = startReleaseServer({ invalid: true, tagName: `v${UPGRADE_TEST_VERSION}` });

    try {
      const proc = await runUpgradeProcess({
        BTERM_GITHUB_RELEASE_API_URL: `${server.url}releases/latest`,
        BTERM_INSTALL_ROOT: installRoot,
      });

      expect(proc.exitCode).toBe(1);
      expect(proc.stderr).toContain("Release archive is missing required path: data");
      expect(readFileSync(join(installRoot, "app", "package.json"), "utf8")).toBe(beforePackage);
    } finally {
      server.stop(true);
      rmSync(installRoot, { recursive: true, force: true });
    }
  });

  test("fails clearly when no GitHub release exists", async () => {
    const installRoot = mkdtempSync(join(tmpdir(), "bterm-upgrade-no-release-"));
    const server = startReleaseServer({ releaseStatus: 404 });

    try {
      const proc = await runUpgradeProcess({
        BTERM_GITHUB_RELEASE_API_URL: `${server.url}releases/latest`,
        BTERM_INSTALL_ROOT: installRoot,
      });

      expect(proc.exitCode).toBe(1);
      expect(proc.stderr).toContain("No GitHub release is available yet.");
    } finally {
      server.stop(true);
      rmSync(installRoot, { recursive: true, force: true });
    }
  });
});
