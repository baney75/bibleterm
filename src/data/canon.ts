export interface CanonBook {
  chapters: number;
  name: string;
  number: number;
  slug: string;
}

export const CANONICAL_BOOKS: CanonBook[] = [
  { number: 1, name: "Genesis", chapters: 50, slug: "genesis" },
  { number: 2, name: "Exodus", chapters: 40, slug: "exodus" },
  { number: 3, name: "Leviticus", chapters: 27, slug: "leviticus" },
  { number: 4, name: "Numbers", chapters: 36, slug: "numbers" },
  { number: 5, name: "Deuteronomy", chapters: 34, slug: "deuteronomy" },
  { number: 6, name: "Joshua", chapters: 24, slug: "joshua" },
  { number: 7, name: "Judges", chapters: 21, slug: "judges" },
  { number: 8, name: "Ruth", chapters: 4, slug: "ruth" },
  { number: 9, name: "1 Samuel", chapters: 31, slug: "1-samuel" },
  { number: 10, name: "2 Samuel", chapters: 24, slug: "2-samuel" },
  { number: 11, name: "1 Kings", chapters: 22, slug: "1-kings" },
  { number: 12, name: "2 Kings", chapters: 25, slug: "2-kings" },
  { number: 13, name: "1 Chronicles", chapters: 29, slug: "1-chronicles" },
  { number: 14, name: "2 Chronicles", chapters: 36, slug: "2-chronicles" },
  { number: 15, name: "Ezra", chapters: 10, slug: "ezra" },
  { number: 16, name: "Nehemiah", chapters: 13, slug: "nehemiah" },
  { number: 17, name: "Esther", chapters: 10, slug: "esther" },
  { number: 18, name: "Job", chapters: 42, slug: "job" },
  { number: 19, name: "Psalms", chapters: 150, slug: "psalms" },
  { number: 20, name: "Proverbs", chapters: 31, slug: "proverbs" },
  { number: 21, name: "Ecclesiastes", chapters: 12, slug: "ecclesiastes" },
  { number: 22, name: "Song of Solomon", chapters: 8, slug: "song-of-solomon" },
  { number: 23, name: "Isaiah", chapters: 66, slug: "isaiah" },
  { number: 24, name: "Jeremiah", chapters: 52, slug: "jeremiah" },
  { number: 25, name: "Lamentations", chapters: 5, slug: "lamentations" },
  { number: 26, name: "Ezekiel", chapters: 48, slug: "ezekiel" },
  { number: 27, name: "Daniel", chapters: 12, slug: "daniel" },
  { number: 28, name: "Hosea", chapters: 14, slug: "hosea" },
  { number: 29, name: "Joel", chapters: 3, slug: "joel" },
  { number: 30, name: "Amos", chapters: 9, slug: "amos" },
  { number: 31, name: "Obadiah", chapters: 1, slug: "obadiah" },
  { number: 32, name: "Jonah", chapters: 4, slug: "jonah" },
  { number: 33, name: "Micah", chapters: 7, slug: "micah" },
  { number: 34, name: "Nahum", chapters: 3, slug: "nahum" },
  { number: 35, name: "Habakkuk", chapters: 3, slug: "habakkuk" },
  { number: 36, name: "Zephaniah", chapters: 3, slug: "zephaniah" },
  { number: 37, name: "Haggai", chapters: 2, slug: "haggai" },
  { number: 38, name: "Zechariah", chapters: 14, slug: "zechariah" },
  { number: 39, name: "Malachi", chapters: 4, slug: "malachi" },
  { number: 40, name: "Matthew", chapters: 28, slug: "matthew" },
  { number: 41, name: "Mark", chapters: 16, slug: "mark" },
  { number: 42, name: "Luke", chapters: 24, slug: "luke" },
  { number: 43, name: "John", chapters: 21, slug: "john" },
  { number: 44, name: "Acts", chapters: 28, slug: "acts" },
  { number: 45, name: "Romans", chapters: 16, slug: "romans" },
  { number: 46, name: "1 Corinthians", chapters: 16, slug: "1-corinthians" },
  { number: 47, name: "2 Corinthians", chapters: 13, slug: "2-corinthians" },
  { number: 48, name: "Galatians", chapters: 6, slug: "galatians" },
  { number: 49, name: "Ephesians", chapters: 6, slug: "ephesians" },
  { number: 50, name: "Philippians", chapters: 4, slug: "philippians" },
  { number: 51, name: "Colossians", chapters: 4, slug: "colossians" },
  { number: 52, name: "1 Thessalonians", chapters: 5, slug: "1-thessalonians" },
  { number: 53, name: "2 Thessalonians", chapters: 3, slug: "2-thessalonians" },
  { number: 54, name: "1 Timothy", chapters: 6, slug: "1-timothy" },
  { number: 55, name: "2 Timothy", chapters: 4, slug: "2-timothy" },
  { number: 56, name: "Titus", chapters: 3, slug: "titus" },
  { number: 57, name: "Philemon", chapters: 1, slug: "philemon" },
  { number: 58, name: "Hebrews", chapters: 13, slug: "hebrews" },
  { number: 59, name: "James", chapters: 5, slug: "james" },
  { number: 60, name: "1 Peter", chapters: 5, slug: "1-peter" },
  { number: 61, name: "2 Peter", chapters: 3, slug: "2-peter" },
  { number: 62, name: "1 John", chapters: 5, slug: "1-john" },
  { number: 63, name: "2 John", chapters: 1, slug: "2-john" },
  { number: 64, name: "3 John", chapters: 1, slug: "3-john" },
  { number: 65, name: "Jude", chapters: 1, slug: "jude" },
  { number: 66, name: "Revelation", chapters: 22, slug: "revelation" },
];

export const CANONICAL_ORDER = CANONICAL_BOOKS.map((book) => book.slug);

export const BOOK_NUMBER_TO_SLUG: Record<number, string> = Object.fromEntries(
  CANONICAL_BOOKS.map((book) => [book.number, book.slug])
);

export const BOOK_NUMBER_TO_NAME: Record<number, string> = Object.fromEntries(
  CANONICAL_BOOKS.map((book) => [book.number, book.name])
);

export const BOOK_SLUG_TO_CHAPTER_COUNT: Record<string, number> = Object.fromEntries(
  CANONICAL_BOOKS.map((book) => [book.slug, book.chapters])
);

export const BOOK_NAMES: Record<string, string> = {};

for (const book of CANONICAL_BOOKS) {
  BOOK_NAMES[book.slug] = book.name;
  const compactNumericSlug = book.slug.replace(/^([1-3])-/, "$1");
  if (compactNumericSlug !== book.slug) {
    BOOK_NAMES[compactNumericSlug] = book.name;
  }
}

export function getBookSlugCandidates(bookSlug: string): string[] {
  const compactNumericSlug = bookSlug.replace(/^([1-3])-/, "$1");
  const hyphenatedNumericSlug = bookSlug.replace(/^([1-3])([a-z])/, "$1-$2");
  return Array.from(new Set([bookSlug, compactNumericSlug, hyphenatedNumericSlug]));
}
