/** bibleterm - Red Letter Text Checker
 * Identifies verses containing words of Jesus (red letter text)
 */

import redLetterData from "./red-letter.json" with { type: "json" };

/**
 * Red letter data structure from JSON
 * Format: { [bookSlug]: { [chapterNum]: string[] } }
 * where string[] is an array of verse numbers as strings
 */
type RedLetterBook = Record<string, string[]>;
type RedLetterData = Record<string, RedLetterBook>;

/**
 * Set of all red letter verse keys for O(1) lookup
 * Keys are in format: "{book}-{chapter}-{verse}"
 * Example: "matthew-5-3", "john-3-16"
 */
const redLetterSet: Set<string> = new Set();

/**
 * Initialize the red letter lookup set from JSON data
 */
function initializeRedLetterSet(): void {
  const data = redLetterData as RedLetterData;

  for (const [bookSlug, chapters] of Object.entries(data)) {
    for (const [chapterNum, verses] of Object.entries(chapters)) {
      for (const verseNum of verses) {
        const key = `${bookSlug}-${chapterNum}-${verseNum}`;
        redLetterSet.add(key);
      }
    }
  }
}

// Initialize on module load
initializeRedLetterSet();

/**
 * Check if a specific verse is red letter text (words of Jesus)
 * @param bookAbbr - Book abbreviation/slug (e.g., "matthew", "john", "1-corinthians")
 * @param chapter - Chapter number (1-indexed)
 * @param verse - Verse number (1-indexed)
 * @returns true if the verse contains red letter text
 * @example
 *   isRedLetter("matthew", 5, 3)  // true (Beatitudes)
 *   isRedLetter("john", 3, 16)    // true (For God so loved...)
 *   isRedLetter("genesis", 1, 1)  // false (Old Testament)
 */
export function isRedLetter(
  bookAbbr: string,
  chapter: number,
  verse: number
): boolean {
  const normalizedBook = bookAbbr.toLowerCase().trim();
  const key = `${normalizedBook}-${chapter}-${verse}`;
  return redLetterSet.has(key);
}

/**
 * Check if a book has any red letter text
 * @param bookAbbr - Book abbreviation/slug
 * @returns true if the book contains any red letter verses
 */
export function bookHasRedLetter(bookAbbr: string): boolean {
  const normalizedBook = bookAbbr.toLowerCase().trim();
  const data = redLetterData as RedLetterData;
  return normalizedBook in data;
}

/**
 * Get all red letter verses for a specific chapter
 * @param bookAbbr - Book abbreviation/slug
 * @param chapter - Chapter number
 * @returns Array of verse numbers that are red letter
 */
export function getRedLetterVersesInChapter(
  bookAbbr: string,
  chapter: number
): number[] {
  const normalizedBook = bookAbbr.toLowerCase().trim();
  const data = redLetterData as RedLetterData;
  const book = data[normalizedBook];

  if (!book) return [];

  const verses = book[String(chapter)];
  if (!verses) return [];

  return verses.map((v) => parseInt(v, 10)).sort((a, b) => a - b);
}

/**
 * Get total count of red letter verses in the Bible
 * @returns Total number of red letter verses
 */
export function getRedLetterCount(): number {
  return redLetterSet.size;
}

/**
 * Get statistics about red letter coverage
 * @returns Statistics object with book and verse counts
 */
export function getRedLetterStats(): {
  totalBooks: number;
  totalChapters: number;
  totalVerses: number;
} {
  const data = redLetterData as RedLetterData;
  let totalChapters = 0;
  let totalVerses = 0;

  for (const chapters of Object.values(data)) {
    totalChapters += Object.keys(chapters).length;
    for (const verses of Object.values(chapters)) {
      totalVerses += verses.length;
    }
  }

  return {
    totalBooks: Object.keys(data).length,
    totalChapters,
    totalVerses,
  };
}
