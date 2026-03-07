import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { describe, expect, test } from "bun:test";
import { CANONICAL_BOOKS } from "./canon";
import {
  parseBibleApiJsonDocument,
  transformBibleApiJsonDocument,
  writeTransformedTranslation,
  type BibleApiJsonDocument,
} from "./import-bibleapi-json";

function buildSyntheticDocument(): BibleApiJsonDocument {
  let verseId = 1000;
  return {
    resultset: {
      row: CANONICAL_BOOKS.flatMap((book) =>
        Array.from({ length: book.chapters }, (_, index) => ({
          field: [
            verseId++,
            book.number,
            index + 1,
            1,
            `${book.name} ${index + 1}:1`,
          ] as [number, number, number, number, string],
        }))
      ),
    },
  };
}

describe("bibleapi json importer", () => {
  test("parses and transforms a full synthetic document", () => {
    const parsed = parseBibleApiJsonDocument(JSON.stringify(buildSyntheticDocument()));
    const transformed = transformBibleApiJsonDocument(parsed, "ASV");

    expect(transformed.translation).toBe("ASV");
    expect(transformed.stats.totalBooks).toBe(66);
    expect(transformed.stats.totalChapters).toBe(1189);
    expect(transformed.stats.totalVerses).toBe(1189);

    const firstSamuel = transformed.chapters.find(
      (chapter) => chapter.bookSlug === "1-samuel" && chapter.chapter === 1
    );
    expect(firstSamuel).toBeDefined();
    expect(firstSamuel?.file.data[0]?.book).toBe("1 Samuel");
  });

  test("writes only hyphenated numeric-book directories", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "bibleterm-import-"));

    try {
      const transformed = transformBibleApiJsonDocument(buildSyntheticDocument(), "KJV");
      writeTransformedTranslation(dataDir, transformed);

      expect(existsSync(join(dataDir, "en-kjv", "1-samuel", "1.json"))).toBe(true);
      expect(existsSync(join(dataDir, "en-kjv", "1samuel"))).toBe(false);

      const chapter = JSON.parse(
        readFileSync(join(dataDir, "en-kjv", "1-samuel", "1.json"), "utf8")
      ) as { data: Array<{ book: string; chapter: string; verse: string; text: string }> };

      expect(chapter.data[0]).toEqual({
        book: "1 Samuel",
        chapter: "1",
        verse: "1",
        text: "1 Samuel 1:1",
      });
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  test("rejects duplicate verse numbers", () => {
    const document = buildSyntheticDocument();
    document.resultset.row = [
      { field: [1, 1, 1, 1, "Genesis 1:1"] },
      { field: [2, 1, 1, 1, "Genesis 1:1 duplicate"] },
      ...document.resultset.row.slice(1),
    ];

    expect(() => transformBibleApiJsonDocument(document, "ASV")).toThrow(
      "Genesis 1:2 expected verse 2, found 1"
    );
  });

  test("rejects missing verses", () => {
    const document = buildSyntheticDocument();
    document.resultset.row = [
      { field: [1, 1, 1, 2, "Genesis 1:2"] },
      ...document.resultset.row.slice(1),
    ];

    expect(() => transformBibleApiJsonDocument(document, "ASV")).toThrow(
      "Genesis 1:1 expected verse 1, found 2"
    );
  });

  test("rejects unknown book numbers", () => {
    const document = buildSyntheticDocument();
    document.resultset.row[0] = { field: [1, 99, 1, 1, "Bogus 1:1"] };

    expect(() => transformBibleApiJsonDocument(document, "ASV")).toThrow("Unknown book number 99");
  });

  test("rejects empty verse text", () => {
    const document = buildSyntheticDocument();
    document.resultset.row[0] = { field: [1, 1, 1, 1, "  "] };

    expect(() => transformBibleApiJsonDocument(document, "ASV")).toThrow("Empty verse text");
  });
});
