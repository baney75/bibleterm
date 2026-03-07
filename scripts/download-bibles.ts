#!/usr/bin/env bun

import { mkdirSync, mkdtempSync, renameSync, rmSync } from "fs";
import path from "path";
import {
  inspectTranslation,
  resetLoaderCaches,
  type TranslationHealth,
} from "../src/data/loader";
import {
  parseBibleApiJsonDocument,
  transformBibleApiJsonDocument,
  writeTransformedTranslation,
  type ImportSourceId,
  type TranslationImportConfig,
} from "../src/data/import-bibleapi-json";
import {
  DEFAULT_SHIPPED_TRANSLATIONS,
} from "../src/state";

const DATA_DIR = path.resolve(import.meta.dir, "..", "data");
const SOURCE_ID: ImportSourceId = "bibleapi-json";
const SOURCE_LABEL = "bibleapi/bibleapi-bibles-json";

const IMPORT_CONFIGS: Record<"ASV" | "KJV", TranslationImportConfig> = {
  ASV: {
    source: SOURCE_ID,
    sourceLabel: SOURCE_LABEL,
    translation: "ASV",
    url: "https://raw.githubusercontent.com/bibleapi/bibleapi-bibles-json/master/asv.json",
  },
  KJV: {
    source: SOURCE_ID,
    sourceLabel: SOURCE_LABEL,
    translation: "KJV",
    url: "https://raw.githubusercontent.com/bibleapi/bibleapi-bibles-json/master/kjv.json",
  },
};

function isImportableTranslation(value: string): value is keyof typeof IMPORT_CONFIGS {
  return value in IMPORT_CONFIGS;
}

class BibleImporter {
  private hadFailures = false;

  constructor(private readonly dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
  }

  private log(message: string): void {
    console.log(message);
  }

  private async fetchText(config: TranslationImportConfig): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(config.url, {
          headers: {
            "User-Agent": "bibleterm-importer/1.0 (educational project)",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < 3) {
          await Bun.sleep(500 * attempt);
        }
      }
    }

    throw lastError ?? new Error(`Failed to fetch ${config.translation}`);
  }

  private stageTranslation(config: TranslationImportConfig, content: string): TranslationHealth {
    const document = parseBibleApiJsonDocument(content);
    const transformed = transformBibleApiJsonDocument(document, config.translation);
    const stageRoot = mkdtempSync(path.join(this.dataDir, ".import-"));
    const targetDir = path.join(this.dataDir, `en-${config.translation.toLowerCase()}`);
    const stagedTranslationDir = path.join(stageRoot, `en-${config.translation.toLowerCase()}`);

    try {
      writeTransformedTranslation(stageRoot, transformed);
      rmSync(targetDir, { recursive: true, force: true });
      renameSync(stagedTranslationDir, targetDir);
    } finally {
      rmSync(stageRoot, { recursive: true, force: true });
    }

    resetLoaderCaches();
    return inspectTranslation(config.translation, {
      allowInvalid: true,
      dataDir: this.dataDir,
    });
  }

  private printHealth(health: TranslationHealth): void {
    const summary = `${health.stats?.totalBooks ?? 0} books, ${health.stats?.totalChapters ?? 0} chapters, ${health.stats?.totalVerses ?? 0} verses`;

    if (health.healthy) {
      this.log(`   health: ok (${summary})`);
      return;
    }

    this.hadFailures = true;
    this.log(`   health: invalid (${summary}; ${health.warningCount} warnings)`);
  }

  async importTranslation(config: TranslationImportConfig): Promise<void> {
    this.log(`\n${config.translation} <- ${config.sourceLabel}`);
    this.log(`   fetch: ${config.url}`);

    try {
      const content = await this.fetchText(config);
      const health = this.stageTranslation(config, content);
      const stats = health.stats;

      this.log(
        `   import: wrote ${stats?.totalBooks ?? 0} books, ${stats?.totalChapters ?? 0} chapters, ${stats?.totalVerses ?? 0} verses`
      );
      this.printHealth(health);
    } catch (error) {
      this.hadFailures = true;
      this.log(`   error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async importAll(configs: TranslationImportConfig[]): Promise<void> {
    this.log("=".repeat(70));
    this.log("bibleterm English translation importer");
    this.log(`Source: ${SOURCE_LABEL} (interim source; verify licensing before redistribution changes)`);
    this.log(`Output: ${this.dataDir}`);
    this.log("=".repeat(70));

    for (const config of configs) {
      await this.importTranslation(config);
    }

    if (this.hadFailures) {
      process.exitCode = 1;
    }
  }
}

const requestedTranslations = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith("--"))
  .map((arg) => arg.toUpperCase());

const translations = (
  requestedTranslations.length > 0 ? requestedTranslations : DEFAULT_SHIPPED_TRANSLATIONS
)
  .filter((translation): translation is keyof typeof IMPORT_CONFIGS => isImportableTranslation(translation));

if (translations.length === 0) {
  console.error("No importable translations selected. Supported: ASV, KJV");
  process.exit(1);
}

const importer = new BibleImporter(DATA_DIR);
importer
  .importAll(translations.map((translation) => IMPORT_CONFIGS[translation]))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
