/** bibleterm - Bible Data Loader
 * Loads and normalizes Bible JSON data from wldeh format
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import type { Translation } from "../state.ts";

// wldeh API format
export interface WldehVerse {
  book: string;
  chapter: string;
  verse: string;
  text: string;
}

export interface WldehChapter {
  data: WldehVerse[];
}

// Internal Bible format
export interface Verse {
  verse: number;
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

// Book abbreviation to name mapping (supports both hyphenated and non-hyphenated)
const BOOK_NAMES: Record<string, string> = {
  genesis: "Genesis",
  exodus: "Exodus",
  leviticus: "Leviticus",
  numbers: "Numbers",
  deuteronomy: "Deuteronomy",
  joshua: "Joshua",
  judges: "Judges",
  ruth: "Ruth",
  "1-samuel": "1 Samuel",
  "1samuel": "1 Samuel",
  "2-samuel": "2 Samuel",
  "2samuel": "2 Samuel",
  "1-kings": "1 Kings",
  "1kings": "1 Kings",
  "2-kings": "2 Kings",
  "2kings": "2 Kings",
  "1-chronicles": "1 Chronicles",
  "1chronicles": "1 Chronicles",
  "2-chronicles": "2 Chronicles",
  "2chronicles": "2 Chronicles",
  ezra: "Ezra",
  nehemiah: "Nehemiah",
  esther: "Esther",
  job: "Job",
  psalms: "Psalms",
  proverbs: "Proverbs",
  ecclesiastes: "Ecclesiastes",
  "song-of-solomon": "Song of Solomon",
  isaiah: "Isaiah",
  jeremiah: "Jeremiah",
  lamentations: "Lamentations",
  ezekiel: "Ezekiel",
  daniel: "Daniel",
  hosea: "Hosea",
  joel: "Joel",
  amos: "Amos",
  obadiah: "Obadiah",
  jonah: "Jonah",
  micah: "Micah",
  nahum: "Nahum",
  habakkuk: "Habakkuk",
  zephaniah: "Zephaniah",
  haggai: "Haggai",
  zechariah: "Zechariah",
  malachi: "Malachi",
  matthew: "Matthew",
  mark: "Mark",
  luke: "Luke",
  john: "John",
  acts: "Acts",
  romans: "Romans",
  "1-corinthians": "1 Corinthians",
  "1corinthians": "1 Corinthians",
  "2-corinthians": "2 Corinthians",
  "2corinthians": "2 Corinthians",
  galatians: "Galatians",
  ephesians: "Ephesians",
  philippians: "Philippians",
  colossians: "Colossians",
  "1-thessalonians": "1 Thessalonians",
  "1thessalonians": "1 Thessalonians",
  "2-thessalonians": "2 Thessalonians",
  "2thessalonians": "2 Thessalonians",
  "1-timothy": "1 Timothy",
  "1timothy": "1 Timothy",
  "2-timothy": "2 Timothy",
  "2timothy": "2 Timothy",
  titus: "Titus",
  philemon: "Philemon",
  hebrews: "Hebrews",
  james: "James",
  "1-peter": "1 Peter",
  "1peter": "1 Peter",
  "2-peter": "2 Peter",
  "2peter": "2 Peter",
  "1-john": "1 John",
  "1john": "1 John",
  "2-john": "2 John",
  "2john": "2 John",
  "3-john": "3 John",
  "3john": "3 John",
  jude: "Jude",
  revelation: "Revelation",
};

// Expected book order (canonical order) - non-hyphenated format preferred
const CANONICAL_ORDER = [
  "genesis", "exodus", "leviticus", "numbers", "deuteronomy",
  "joshua", "judges", "ruth", "1samuel", "2samuel",
  "1kings", "2kings", "1chronicles", "2chronicles", "ezra",
  "nehemiah", "esther", "job", "psalms", "proverbs",
  "ecclesiastes", "song-of-solomon", "isaiah", "jeremiah", "lamentations",
  "ezekiel", "daniel", "hosea", "joel", "amos",
  "obadiah", "jonah", "micah", "nahum", "habakkuk",
  "zephaniah", "haggai", "zechariah", "malachi",
  "matthew", "mark", "luke", "john", "acts",
  "romans", "1corinthians", "2corinthians", "galatians", "ephesians",
  "philippians", "colossians", "1thessalonians", "2thessalonians",
  "1timothy", "2timothy", "titus", "philemon", "hebrews",
  "james", "1peter", "2peter", "1john", "2john", "3john",
  "jude", "revelation"
];

/**
 * Normalize wldeh verse data to internal Verse format
 */
function normalizeVerse(wldehVerse: WldehVerse): Verse {
  return {
    verse: parseInt(wldehVerse.verse, 10),
    text: wldehVerse.text,
  };
}

/**
 * Load a single chapter from JSON file
 */
function loadChapter(
  bookDir: string,
  chapterNum: number
): Chapter | null {
  const chapterPath = join(bookDir, `${chapterNum}.json`);

  if (!existsSync(chapterPath)) {
    return null;
  }

  try {
    const content = readFileSync(chapterPath, "utf-8");
    const chapterData: WldehChapter = JSON.parse(content);

    if (!chapterData.data || !Array.isArray(chapterData.data)) {
      throw new Error(`Invalid chapter data format in ${chapterPath}`);
    }

    const verses = chapterData.data.map(normalizeVerse);

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
  bookSlug: string
): Book | null {
  let bookDir = join(translationDir, bookSlug);

  if (!existsSync(bookDir)) {
    const candidates = [
      bookSlug.replace(/^(\d)([a-z])/, "$1-$2"),
      bookSlug.replace(/^(\d)-([a-z])/, "$1$2"),
    ];

    for (const candidate of candidates) {
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
      const chapter = loadChapter(bookDir, chapterNum);
      if (chapter) {
        chapters.push(chapter);
      }
    }

    if (chapters.length === 0) {
      return null;
    }

    // Get actual slug from directory path (handles both hyphenated and non-hyphenated)
    const actualSlug = bookDir.split('/').pop() || bookSlug;
    
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

/**
 * Load Bible data for a specific translation
 * @param translation - Translation code (e.g., "ASV", "KJV")
 * @returns Bible object or null if data not found
 */
function getDataDir(): string {
  // For compiled binary: check relative to executable
  // For dev: check relative to source file
  
  // Get the binary's directory (works for compiled binaries)
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
    // Standard install location (~/.local/share/bibleterm/data)
    resolve(process.env.HOME || "", ".local", "share", "bibleterm", "data"),
    // System-wide install location
    resolve("/usr", "local", "share", "bibleterm", "data"),
    // Runtime location (where binary is run from)
    resolve(process.cwd(), "data"),
    // Binary location (next to compiled binary)
    resolve(binaryDir || "", "..", "data"),
    resolve(binaryDir || "", "data"),
    // Dev location (relative to source)
    resolve(import.meta.dirname || "", "..", "..", "..", "data"),
    resolve(import.meta.dirname || "", "..", "..", "data"),
    // Project root fallback
    resolve(__dirname || "", "..", "..", "data"),
  ];
  
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }
  
  // Default to standard location
  return resolve(process.env.HOME || process.cwd(), ".local", "share", "bibleterm", "data");
}

export function loadBible(translation: Translation): Bible | null {
  const dataDir = getDataDir();
  const translationSlug = `en-${translation.toLowerCase()}`;
  const translationDir = join(dataDir, translationSlug);

  if (!existsSync(translationDir)) {
    console.error(`Translation directory not found: ${translationDir}`);
    return null;
  }

  const books: Book[] = [];

  // Load books in canonical order
  for (const bookSlug of CANONICAL_ORDER) {
    const book = loadBook(translationDir, bookSlug);
    if (book) {
      books.push(book);
    }
  }

  if (books.length === 0) {
    console.error(`No books loaded for translation: ${translation}`);
    return null;
  }

  // Validate data integrity
  const validation = validateBible({ translation, books });
  if (!validation.valid) {
    console.warn(`Bible validation warnings for ${translation}:`, validation.warnings);
  }

  return {
    translation,
    books,
  };
}

/**
 * Get list of available translations
 */
export function getAvailableTranslations(): Translation[] {
  const dataDir = getDataDir();
  const translations: Translation[] = [];

  if (!existsSync(dataDir)) {
    return translations;
  }

  try {
    const entries = readdirSync(dataDir);

    for (const entry of entries) {
      if (entry.startsWith("en-")) {
        const translationCode = entry.replace("en-", "").toUpperCase();
        if (isValidTranslation(translationCode)) {
          translations.push(translationCode as Translation);
        }
      }
    }
  } catch (error) {
    console.error("Error reading data directory:", error);
  }

  return translations;
}

/**
 * Type guard for Translation
 */
function isValidTranslation(code: string): boolean {
  return ["ASV", "KJV", "WEB", "YLT"].includes(code);
}

/**
 * Validate Bible data integrity
 */
export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  stats: {
    totalBooks: number;
    totalChapters: number;
    totalVerses: number;
  };
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
