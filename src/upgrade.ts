import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import {
  getAvailableTranslations,
  getInstalledTranslations,
  inspectTranslation,
  resetLoaderCaches,
} from "./data/loader";
import {
  readInstalledVersion,
  replaceInstalledTree,
  resolveInstallPaths,
  type InstallPaths,
} from "./install-layout";
import {
  DEFAULT_UPGRADE_COMMAND,
  GITHUB_OWNER,
  GITHUB_REPO,
  VERSION,
} from "./meta";

export type UpgradeChannel = "release";

export interface GitHubReleaseInfo {
  tagName: string;
  tarballUrl: string;
  version: string;
}

export interface UpgradeOptions {
  checkOnly?: boolean;
  force?: boolean;
  logger?: (message: string) => void;
}

export interface UpgradeResult {
  fromVersion: string | null;
  message: string;
  toVersion: string;
  updated: boolean;
}

function getReleaseApiUrl(): string {
  return (
    process.env.BTERM_GITHUB_RELEASE_API_URL ||
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
  );
}

function parseReleaseVersion(tagName: string): string {
  const version = tagName.replace(/^v/i, "").trim();
  if (!version) {
    throw new Error(`Release tag is missing a version: ${tagName}`);
  }
  return version;
}

function getTarballUrl(release: GitHubReleaseInfo): string {
  const envUrl = process.env.BTERM_UPGRADE_TARBALL_URL;
  if (envUrl) {
    if (!envUrl.startsWith("https://")) {
      throw new Error(`Insecure tarball URL provided: ${envUrl}. Only 'https://' URLs are allowed.`);
    }
    return envUrl;
  }
  return release.tarballUrl;
}

function resolveTarPath(): string {
  const candidates = ["/usr/bin/tar", "/bin/tar"];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error("The `tar` command is required for `bterm upgrade` but was not found.");
}

function ensureTarAvailable(): void {
  const tarPath = resolveTarPath();
  const result = Bun.spawnSync([tarPath, "--version"], {
    env: { ...process.env, PATH: "/usr/bin:/bin" },
    stderr: "pipe",
    stdout: "ignore",
  });
  if (result.exitCode !== 0) {
    throw new Error(`The \`tar\` command at ${tarPath} failed to execute.`);
  }
}

function findProjectRoot(rootDir: string): string | null {
  const queue = [{ depth: 0, path: resolve(rootDir) }];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const currentEntry = queue.shift()!;
    const current = currentEntry.path;
    if (seen.has(current)) continue;
    seen.add(current);

    if (
      existsSync(join(current, "src", "main.ts")) &&
      existsSync(join(current, "data")) &&
      existsSync(join(current, "package.json"))
    ) {
      return current;
    }

    if (currentEntry.depth >= 4) {
      continue;
    }

    let entries: string[] = [];
    try {
      entries = readdirSync(current);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const child = join(current, entry);
      try {
        if (statSync(child).isDirectory()) {
          queue.push({ depth: currentEntry.depth + 1, path: child });
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

export async function fetchLatestReleaseInfo(): Promise<GitHubReleaseInfo> {
  const response = await fetch(getReleaseApiUrl(), {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": `bterm/${VERSION}`,
    },
  });

  if (response.status === 404) {
    throw new Error(
      "No GitHub release is available yet. Maintainers must publish a GitHub Release before users can run `bterm upgrade`."
    );
  }

  if (!response.ok) {
    throw new Error(`GitHub release lookup failed with HTTP ${response.status}.`);
  }

  const payload = await response.json() as {
    tag_name?: unknown;
    tarball_url?: unknown;
  };

  if (typeof payload.tag_name !== "string" || typeof payload.tarball_url !== "string") {
    throw new Error("GitHub release metadata was malformed.");
  }

  return {
    tagName: payload.tag_name,
    tarballUrl: payload.tarball_url,
    version: parseReleaseVersion(payload.tag_name),
  };
}

export async function downloadReleaseTarball(
  release: GitHubReleaseInfo,
  targetDir: string
): Promise<string> {
  mkdirSync(targetDir, { recursive: true });
  const response = await fetch(getTarballUrl(release), {
    headers: {
      "User-Agent": `bterm/${VERSION}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Release download failed with HTTP ${response.status}.`);
  }

  const archivePath = join(targetDir, `${GITHUB_REPO}-${release.version}.tar.gz`);
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(archivePath, bytes);
  return archivePath;
}

export function extractReleaseArchive(archivePath: string, extractDir: string): string {
  const tarPath = resolveTarPath();
  mkdirSync(extractDir, { recursive: true });

  const result = Bun.spawnSync([tarPath, "-xzf", archivePath, "-C", extractDir], {
    env: { ...process.env, PATH: "/usr/bin:/bin" },
    stderr: "pipe",
    stdout: "ignore",
  });

  if (result.exitCode !== 0) {
    const stderr = Buffer.from(result.stderr).toString("utf8").trim();
    throw new Error(stderr || "Failed to extract release archive.");
  }

  try {
    const topLevelEntries = readdirSync(extractDir);
    if (topLevelEntries.length === 1) {
      const candidate = join(extractDir, topLevelEntries[0]);
      if (
        existsSync(join(candidate, "package.json")) ||
        existsSync(join(candidate, "src", "main.ts")) ||
        existsSync(join(candidate, "data"))
      ) {
        return candidate;
      }
    }
  } catch {
    // Fall through to recursive search.
  }

  const projectRoot = findProjectRoot(extractDir);
  if (!projectRoot) {
    throw new Error("Could not find a valid bterm project root inside the extracted archive.");
  }

  return projectRoot;
}

export function validateReleaseTree(projectRoot: string): void {
  const requiredPaths = ["src/main.ts", "data", "package.json"];
  for (const relativePath of requiredPaths) {
    const fullPath = join(projectRoot, relativePath);
    if (!existsSync(fullPath)) {
      throw new Error(`Release archive is missing required path: ${relativePath}`);
    }
  }
}

function readPackageVersion(projectRoot: string): string | null {
  try {
    const parsed = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8")) as {
      version?: unknown;
    };
    return typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    return null;
  }
}

function validateInstalledHealth(paths: InstallPaths): void {
  resetLoaderCaches();
  const installed = getInstalledTranslations({ dataDir: paths.dataDir });
  const healthy = getAvailableTranslations({ dataDir: paths.dataDir });

  if (installed.length === 0) {
    throw new Error("Updated install did not contain any translations.");
  }

  for (const translation of installed) {
    const health = inspectTranslation(translation, {
      allowInvalid: true,
      dataDir: paths.dataDir,
    });
    if (!health.healthy) {
      throw new Error(
        `${translation} is unhealthy after upgrade (${health.warningCount} warnings).`
      );
    }
  }

  if (healthy.length !== installed.length) {
    throw new Error("Updated install has unhealthy translations after upgrade.");
  }
}

function resolveFallbackSourceRoot(): string | undefined {
  if (process.env.BTERM_INSTALL_MODE !== "fallback") {
    return undefined;
  }

  const cwdRoot = resolve(process.cwd());
  if (existsSync(join(cwdRoot, "src", "main.ts")) && existsSync(join(cwdRoot, "data"))) {
    return cwdRoot;
  }

  return undefined;
}

export async function runUpgrade(options: UpgradeOptions = {}): Promise<UpgradeResult> {
  const log = options.logger || (() => {});
  const paths = resolveInstallPaths();
  const installedVersion = readInstalledVersion(paths);
  const release = await fetchLatestReleaseInfo();

  if (!options.force && installedVersion && installedVersion === release.version) {
    return {
      fromVersion: installedVersion,
      message: `Already up to date: v${release.version}`,
      toVersion: release.version,
      updated: false,
    };
  }

  if (options.checkOnly) {
    return {
      fromVersion: installedVersion,
      message: installedVersion
        ? `Installed v${installedVersion}; latest release is v${release.version}`
        : `Latest release is v${release.version}`,
      toVersion: release.version,
      updated: false,
    };
  }

  const tempRoot = mkdtempSync(join(tmpdir(), "bterm-upgrade-"));

  try {
    log(`Current version: ${installedVersion ? `v${installedVersion}` : "not installed"}`);
    log(`Latest release: v${release.version}`);
    const archivePath = await downloadReleaseTarball(release, join(tempRoot, "download"));
    log(`Downloaded: ${archivePath}`);

    const extractedRoot = extractReleaseArchive(archivePath, join(tempRoot, "extract"));
    validateReleaseTree(extractedRoot);

    const packageVersion = readPackageVersion(extractedRoot);
    if (packageVersion !== release.version) {
      throw new Error(
        `Release package version mismatch: expected ${release.version}, found ${packageVersion || "missing"}.`
      );
    }

    replaceInstalledTree({
      fallbackSourceRoot: resolveFallbackSourceRoot(),
      paths,
      sourceRoot: extractedRoot,
    });
    validateInstalledHealth(paths);

    return {
      fromVersion: installedVersion,
      message: installedVersion
        ? `Updated from v${installedVersion} to v${release.version}`
        : `Installed v${release.version}. Future updates: ${DEFAULT_UPGRADE_COMMAND}`,
      toVersion: release.version,
      updated: true,
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
