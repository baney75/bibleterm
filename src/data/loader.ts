/** bibleterm - Bible Data Loader
 * Loads and normalizes persisted per-chapter Bible JSON data.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { basename, join, resolve } from "path";
import type { Translation } from "../state.ts";
import { BOOK_NAMES, CANONICAL_ORDER, getBookSlugCandidates } from "./canon";
import { sanitizeVerseText } from "./sanitize";

export interface StoredVerseRecord {
  book: string;
  chapter: string;
  verse: string;
  text: string;
}

export interface StoredChapterFile {
  data: StoredVerseRecord[];
}

// Internal Bible format
export interface Verse {
  verse: number;
  paragraphStart?: boolean;
  text: string;
}

export interface Chapter {
  chapter: number;
  verses: Verse[];
}

export interface Book {
  name: string;
  slug: string;
  abbreviation: string;
  chapters: Chapter[];
}

export interface Bible {
  translation: string;
  books: Book[];
}

/**
 * Normalize a stored verse record to the internal runtime Verse format.
 */
function normalizeVerse(record: StoredVerseRecord, translation: Translation): Verse {
  const chapter = parseInt(record.chapter, 10);
  const verse = parseInt(record.verse, 10);
  const sanitized = sanitizeVerseText(record.text, translation, chapter, verse);

  return {
    verse,
    paragraphStart: sanitized.paragraphStart,
    text: sanitized.text,
  };
}

/**
 * Load a single chapter from JSON file
 */
function loadChapter(
  bookDir: string,
  chapterNum: number,
  translation: Translation
): Chapter | null {
  const chapterPath = join(bookDir, `${chapterNum}.json`);

  if (!existsSync(chapterPath)) {
    return null;
  }

  try {
    const content = readFileSync(chapterPath, "utf-8");
    const chapterData: StoredChapterFile = JSON.parse(content);

    if (!chapterData.data || !Array.isArray(chapterData.data)) {
      throw new Error(`Invalid chapter data format in ${chapterPath}`);
    }

    const verses = chapterData.data.map((verse) => normalizeVerse(verse, translation));

    return {
      chapter: chapterNum,
      verses,
    };
  } catch (error) {
    console.error(`Error loading chapter ${chapterNum} from ${bookDir}:`, error);
    return null;
  }
}

/**
 * Load all chapters for a book
 * Tries both hyphenated and non-hyphenated naming conventions
 */
function loadBook(
  translationDir: string,
  bookSlug: string,
  translation: Translation
): Book | null {
  let bookDir = join(translationDir, bookSlug);

  if (!existsSync(bookDir)) {
    for (const candidate of getBookSlugCandidates(bookSlug)) {
      const candidateDir = join(translationDir, candidate);
      if (existsSync(candidateDir)) {
        bookDir = candidateDir;
        break;
      }
    }
  }

  if (!existsSync(bookDir)) {
    return null;
  }

  try {
    const files = readdirSync(bookDir);
    const chapterFiles = files
      .filter((f) => f.endsWith(".json"))
      .map((f) => parseInt(f.replace(".json", ""), 10))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    const chapters: Chapter[] = [];

    for (const chapterNum of chapterFiles) {
      const chapter = loadChapter(bookDir, chapterNum, translation);
      if (chapter) {
        chapters.push(chapter);
      }
    }

    if (chapters.length === 0) {
      return null;
    }

    const actualSlug = basename(bookDir) || bookSlug;

    return {
      name: BOOK_NAMES[actualSlug] || BOOK_NAMES[bookSlug] || bookSlug,
      slug: actualSlug,
      abbreviation: actualSlug,
      chapters,
    };
  } catch (error) {
    console.error(`Error loading book ${bookSlug}:`, error);
    return null;
  }
}

const KNOWN_TRANSLATIONS: Translation[] = ["ASV", "KJV", "WEB", "YLT"];

export interface LoaderOptions {
  allowInvalid?: boolean;
  dataDir?: string;
}

/**
 * Result of a Bible validation check
 */
interface ValidationResult {
  valid: boolean;
  warnings: string[];
  stats: {
    totalBooks: number;
    totalChapters: number;
    totalVerses: number;
  };
}

export interface TranslationHealth {
  installed: boolean;
  healthy: boolean;
  stats: ValidationResult["stats"] | null;
  translation: Translation;
  warningCount: number;
  warnings: string[];
}

const bibleCache = new Map<string, Bible | null>();
const translationHealthCache = new Map<string, TranslationHealth>();

export function resetLoaderCaches(): void {
  bibleCache.clear();
  translationHealthCache.clear();
}

function resolveDataDir(override?: string): string {
  if (override) return resolve(override);
  if (process.env.BIBLETERM_DATA_DIR) {
    return resolve(process.env.BIBLETERM_DATA_DIR);
  }

  let binaryDir = "";
  try {
    // @ts-ignore - Bun specific
    if (process.execPath) {
      binaryDir = process.execPath;
    }
  } catch {
    // Fallback
  }

  const possiblePaths = [
    resolve(process.cwd(), "data"),
    resolve(process.env.HOME || "", ".local", "share", "bibleterm", "data"),
    resolve("/usr", "local", "share", "bibleterm", "data"),
    resolve(binaryDir || "", "..", "data"),
    resolve(binaryDir || "", "data"),
    resolve(import.meta.dirname || "", "..", "..", "..", "data"),
    resolve(import.meta.dirname || "", "..", "..", "data"),
    resolve(__dirname || "", "..", "..", "data"),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return resolve(process.env.HOME || process.cwd(), ".local", "share", "bibleterm", "data");
}

function getCacheKey(dataDir: string, translation: Translation): string {
  return `${resolve(dataDir)}::${translation}`;
}

function getTranslationDir(dataDir: string, translation: Translation): string {
  return join(dataDir, `en-${translation.toLowerCase()}`);
}

function readBible(translation: Translation, dataDir: string): Bible | null {
  const cacheKey = getCacheKey(dataDir, translation);
  if (bibleCache.has(cacheKey)) {
    return bibleCache.get(cacheKey) ?? null;
  }

  const translationDir = getTranslationDir(dataDir, translation);
  if (!existsSync(translationDir)) {
    bibleCache.set(cacheKey, null);
    return null;
  }

  const books: Book[] = [];
  for (const bookSlug of CANONICAL_ORDER) {
    const book = loadBook(translationDir, bookSlug, translation);
    if (book) {
      books.push(book);
    }
  }

  const bible = books.length === 0
    ? null
    : {
        translation,
        books,
      };

  bibleCache.set(cacheKey, bible);
  return bible;
}

export function inspectTranslation(
  translation: Translation,
  options: LoaderOptions = {}
): TranslationHealth {
  const dataDir = resolveDataDir(options.dataDir);
  const cacheKey = getCacheKey(dataDir, translation);

  if (translationHealthCache.has(cacheKey)) {
    return translationHealthCache.get(cacheKey)!;
  }

  const translationDir = getTranslationDir(dataDir, translation);
  if (!existsSync(translationDir)) {
    const missing: TranslationHealth = {
      installed: false,
      healthy: false,
      stats: null,
      translation,
      warningCount: 0,
      warnings: [],
    };
    translationHealthCache.set(cacheKey, missing);
    return missing;
  }

  const bible = readBible(translation, dataDir);
  if (!bible) {
    const unreadable: TranslationHealth = {
      installed: true,
      healthy: false,
      stats: null,
      translation,
      warningCount: 1,
      warnings: ["Bible files were present but could not be loaded."],
    };
    translationHealthCache.set(cacheKey, unreadable);
    return unreadable;
  }

  const validation = validateBible(bible);
  const health: TranslationHealth = {
    installed: true,
    healthy: validation.valid,
    stats: validation.stats,
    translation,
    warningCount: validation.warnings.length,
    warnings: validation.warnings,
  };

  translationHealthCache.set(cacheKey, health);
  return health;
}

export function loadBible(
  translation: Translation,
  options: LoaderOptions = {}
): Bible | null {
  const dataDir = resolveDataDir(options.dataDir);
  const translationDir = getTranslationDir(dataDir, translation);
  const bible = readBible(translation, dataDir);

  if (!bible) {
    const reason = existsSync(translationDir)
      ? `Translation data could not be loaded: ${translationDir}`
      : `Translation directory not found: ${translationDir}`;
    console.error(reason);
    return null;
  }

  const health = inspectTranslation(translation, {
    dataDir,
    allowInvalid: true,
  });

  if (!health.healthy && !options.allowInvalid) {
    console.error(
      `${translation} data is unhealthy: ${health.warningCount} warnings (${health.stats?.totalBooks ?? 0} books, ${health.stats?.totalChapters ?? 0} chapters, ${health.stats?.totalVerses ?? 0} verses).`
    );
    return null;
  }

  return bible;
}

export function getInstalledTranslations(options: LoaderOptions = {}): Translation[] {
  const dataDir = resolveDataDir(options.dataDir);
  if (!existsSync(dataDir)) {
    return [];
  }

  try {
    const installed = readdirSync(dataDir)
      .filter((entry) => entry.startsWith("en-"))
      .map((entry) => entry.replace("en-", "").toUpperCase())
      .filter((entry): entry is Translation => isValidTranslation(entry));

    return KNOWN_TRANSLATIONS.filter((translation) => installed.includes(translation));
  } catch (error) {
    console.error("Error reading data directory:", error);
    return [];
  }
}

export function getAvailableTranslations(options: LoaderOptions = {}): Translation[] {
  return getInstalledTranslations(options).filter((translation) =>
    inspectTranslation(translation, { dataDir: options.dataDir, allowInvalid: true }).healthy
  );
}

function isValidTranslation(code: string): code is Translation {
  return KNOWN_TRANSLATIONS.includes(code as Translation);
}

export function validateBible(bible: Bible): ValidationResult {
  const warnings: string[] = [];
  let totalChapters = 0;
  let totalVerses = 0;

  // Check for expected book count (66 for Protestant canon)
  if (bible.books.length !== 66) {
    warnings.push(`Expected 66 books, found ${bible.books.length}`);
  }

  // Check each book has chapters
  for (const book of bible.books) {
    if (book.chapters.length === 0) {
      warnings.push(`Book "${book.name}" has no chapters`);
    }

    totalChapters += book.chapters.length;

    // Check each chapter has verses
    for (const chapter of book.chapters) {
      if (chapter.verses.length === 0) {
        warnings.push(`${book.name} ${chapter.chapter} has no verses`);
      }

      totalVerses += chapter.verses.length;

      // Check verse numbers are sequential
      let expectedVerse = 1;
      for (const verse of chapter.verses) {
        if (verse.verse !== expectedVerse) {
          warnings.push(
            `${book.name} ${chapter.chapter}:${expectedVerse} - expected verse ${expectedVerse}, found ${verse.verse}`
          );
        }
        expectedVerse++;
      }
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
    stats: {
      totalBooks: bible.books.length,
      totalChapters,
      totalVerses,
    },
  };
}
