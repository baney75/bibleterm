import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { describe, expect, test } from "bun:test";
import {
  getAvailableTranslations,
  getInstalledTranslations,
  inspectTranslation,
  loadBible,
  validateBible,
  type Bible,
} from "./loader";

const REPO_DATA_DIR = resolve(import.meta.dir, "..", "..", "data");

function createFixtureDataDir(): string {
  const dataDir = mkdtempSync(join(tmpdir(), "bibleterm-loader-"));
  cpSync(join(REPO_DATA_DIR, "en-asv"), join(dataDir, "en-asv"), { recursive: true });

  const chapterDir = join(dataDir, "en-kjv", "genesis");
  mkdirSync(chapterDir, { recursive: true });
  writeFileSync(
    join(chapterDir, "1.json"),
    JSON.stringify(
      {
        data: [
          { book: "Genesis", chapter: "1", verse: "1", text: "first" },
          { book: "Genesis", chapter: "1", verse: "1", text: "duplicate" },
        ],
      },
      null,
      2
    )
  );

  return dataDir;
}

describe("data loader integrity", () => {
  test("loads shipped ASV and KJV with expected canonical totals", () => {
    const expectations: Array<[translation: "ASV" | "KJV", expectedVerses: number]> = [
      ["ASV" as const, 31103],
      ["KJV" as const, 31103],
    ];

    for (const [translation, expectedVerses] of expectations) {
      const bible = loadBible(translation, { dataDir: REPO_DATA_DIR });
      expect(bible).not.toBeNull();

      const loaded = bible as Bible;
      expect(loaded.books[0]?.slug).toBe("genesis");
      expect(loaded.books[loaded.books.length - 1]?.slug).toBe("revelation");

      const stats = validateBible(loaded).stats;
      expect(stats.totalBooks).toBe(66);
      expect(stats.totalChapters).toBe(1189);
      expect(stats.totalVerses).toBe(expectedVerses);
    }
  });

  test("reports shipped ASV and KJV as installed and healthy", () => {
    expect(getInstalledTranslations({ dataDir: REPO_DATA_DIR })).toEqual(["ASV", "KJV"]);
    expect(getAvailableTranslations({ dataDir: REPO_DATA_DIR })).toEqual(["ASV", "KJV"]);
  });

  test("distinguishes installed translations from healthy ones", () => {
    const dataDir = createFixtureDataDir();

    try {
      expect(getInstalledTranslations({ dataDir })).toEqual(["ASV", "KJV"]);
      expect(getAvailableTranslations({ dataDir })).toEqual(["ASV"]);

      const health = inspectTranslation("KJV", { dataDir, allowInvalid: true });
      expect(health.installed).toBe(true);
      expect(health.healthy).toBe(false);
      expect(health.warningCount).toBeGreaterThan(0);
      expect(health.warnings).toContain("Expected 66 books, found 1");
      expect(
        health.warnings.some((warning) => warning.includes("Genesis 1:2 - expected verse 2, found 1"))
      ).toBe(true);
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  test("rejects unhealthy translations by default but allows diagnostic load", () => {
    const dataDir = createFixtureDataDir();

    try {
      const error = console.error;
      try {
        console.error = () => {};
        expect(loadBible("KJV", { dataDir })).toBeNull();
      } finally {
        console.error = error;
      }

      const bible = loadBible("KJV", {
        allowInvalid: true,
        dataDir,
      });

      expect(bible).not.toBeNull();
      expect(validateBible(bible as Bible).valid).toBe(false);
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  test("flags non-sequential verses", () => {
    const synthetic: Bible = {
      translation: "ASV",
      books: [
        {
          name: "Genesis",
          slug: "genesis",
          abbreviation: "gen",
          chapters: [
            {
              chapter: 1,
              verses: [
                { verse: 1, text: "first" },
                { verse: 3, text: "skips two" },
              ],
            },
          ],
        },
      ],
    };

    const result = validateBible(synthetic);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((warning) => warning.includes("expected verse 2, found 3"))).toBe(
      true
    );
  });
});
