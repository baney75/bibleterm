import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { Translation } from "../state";
import {
  BOOK_NUMBER_TO_NAME,
  BOOK_NUMBER_TO_SLUG,
  CANONICAL_BOOKS,
} from "./canon";
import type { StoredChapterFile, StoredVerseRecord } from "./loader";

export type ImportSourceId = "bibleapi-json";

export interface TranslationImportConfig {
  source: ImportSourceId;
  sourceLabel: string;
  translation: Translation;
  url: string;
}

export interface BibleApiJsonVerseRow {
  field: [number, number, number, number, string];
}

export interface BibleApiJsonDocument {
  resultset: {
    row: BibleApiJsonVerseRow[];
  };
}

export interface TransformedChapterFile {
  bookName: string;
  bookSlug: string;
  chapter: number;
  file: StoredChapterFile;
}

export interface TransformedTranslation {
  chapters: TransformedChapterFile[];
  stats: {
    totalBooks: number;
    totalChapters: number;
    totalVerses: number;
  };
  translation: Translation;
}

interface ParsedVerseRow {
  bookName: string;
  bookNumber: number;
  bookSlug: string;
  chapter: number;
  text: string;
  verse: number;
}

function parseVerseRow(row: BibleApiJsonVerseRow, index: number): ParsedVerseRow {
  if (!row || typeof row !== "object" || !Array.isArray(row.field) || row.field.length !== 5) {
    throw new Error(`Invalid verse row at index ${index}`);
  }

  const [, bookNumber, chapter, verse, text] = row.field;
  const bookSlug = BOOK_NUMBER_TO_SLUG[bookNumber];
  const bookName = BOOK_NUMBER_TO_NAME[bookNumber];

  if (!bookSlug || !bookName) {
    throw new Error(`Unknown book number ${bookNumber} at row ${index}`);
  }
  if (!Number.isInteger(chapter) || chapter < 1) {
    throw new Error(`Invalid chapter number ${chapter} at row ${index}`);
  }
  if (!Number.isInteger(verse) || verse < 1) {
    throw new Error(`Invalid verse number ${verse} at row ${index}`);
  }
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error(`Empty verse text at row ${index}`);
  }

  return {
    bookName,
    bookNumber,
    bookSlug,
    chapter,
    text,
    verse,
  };
}

function toStoredVerseRecord(row: ParsedVerseRow): StoredVerseRecord {
  return {
    book: row.bookName,
    chapter: String(row.chapter),
    verse: String(row.verse),
    text: row.text,
  };
}

export function parseBibleApiJsonDocument(content: string): BibleApiJsonDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse Bible JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("resultset" in parsed) ||
    !parsed.resultset ||
    typeof parsed.resultset !== "object" ||
    !("row" in parsed.resultset) ||
    !Array.isArray(parsed.resultset.row)
  ) {
    throw new Error("Bible JSON is missing resultset.row");
  }

  return parsed as BibleApiJsonDocument;
}

export function transformBibleApiJsonDocument(
  document: BibleApiJsonDocument,
  translation: Translation
): TransformedTranslation {
  const parsedRows = document.resultset.row.map(parseVerseRow).sort((left, right) => {
    return (
      left.bookNumber - right.bookNumber ||
      left.chapter - right.chapter ||
      left.verse - right.verse
    );
  });

  const groupedByBook = new Map<string, Map<number, StoredVerseRecord[]>>();
  let totalVerses = 0;

  for (const row of parsedRows) {
    const bookChapters = groupedByBook.get(row.bookSlug) ?? new Map<number, StoredVerseRecord[]>();
    const chapterRows = bookChapters.get(row.chapter) ?? [];
    chapterRows.push(toStoredVerseRecord(row));
    bookChapters.set(row.chapter, chapterRows);
    groupedByBook.set(row.bookSlug, bookChapters);
    totalVerses += 1;
  }

  if (groupedByBook.size !== CANONICAL_BOOKS.length) {
    throw new Error(`Expected ${CANONICAL_BOOKS.length} books, found ${groupedByBook.size}`);
  }

  const chapters: TransformedChapterFile[] = [];

  for (const book of CANONICAL_BOOKS) {
    const bookChapters = groupedByBook.get(book.slug);
    if (!bookChapters) {
      throw new Error(`Missing book ${book.name}`);
    }
    if (bookChapters.size !== book.chapters) {
      throw new Error(
        `${book.name} expected ${book.chapters} chapters, found ${bookChapters.size}`
      );
    }

    for (let chapterNumber = 1; chapterNumber <= book.chapters; chapterNumber += 1) {
      const verseRows = bookChapters.get(chapterNumber);
      if (!verseRows || verseRows.length === 0) {
        throw new Error(`${book.name} is missing chapter ${chapterNumber}`);
      }

      let expectedVerse = 1;
      for (const verseRow of verseRows) {
        const verseNumber = parseInt(verseRow.verse, 10);
        if (parseInt(verseRow.chapter, 10) !== chapterNumber) {
          throw new Error(`${book.name} chapter ${chapterNumber} contains mismatched verse rows`);
        }
        if (verseNumber !== expectedVerse) {
          throw new Error(
            `${book.name} ${chapterNumber}:${expectedVerse} expected verse ${expectedVerse}, found ${verseNumber}`
          );
        }
        expectedVerse += 1;
      }

      chapters.push({
        bookName: book.name,
        bookSlug: book.slug,
        chapter: chapterNumber,
        file: {
          data: verseRows,
        },
      });
    }
  }

  return {
    chapters,
    stats: {
      totalBooks: CANONICAL_BOOKS.length,
      totalChapters: chapters.length,
      totalVerses,
    },
    translation,
  };
}

export function writeTransformedTranslation(
  outputDir: string,
  transformed: TransformedTranslation
): void {
  const translationDir = join(outputDir, `en-${transformed.translation.toLowerCase()}`);
  mkdirSync(translationDir, { recursive: true });

  for (const chapter of transformed.chapters) {
    const bookDir = join(translationDir, chapter.bookSlug);
    mkdirSync(bookDir, { recursive: true });
    const chapterPath = join(bookDir, `${chapter.chapter}.json`);
    writeFileSync(chapterPath, `${JSON.stringify(chapter.file, null, 2)}\n`, "utf8");
  }
}
