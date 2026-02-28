import type { Bible } from "./data/loader";

export type SearchResult = {
  book: string;
  bookSlug: string;
  chapter: number;
  verse: number;
  text: string;
  score: number;
};

type IndexedVerse = {
  book: string;
  bookSlug: string;
  chapter: number;
  verse: number;
  text: string;
  textLower: string;
  compact: string;
};

let searchIndex: IndexedVerse[] = [];
let isBuildingIndex = false;

function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getSearchTerms(query: string): string[] {
  const q = normalizeSearchText(query);
  if (!q) return [];
  return q.split(" ").filter((w) => w.length >= 2);
}

export function buildSearchIndex(bible: Bible): void {
  if (isBuildingIndex) return;
  isBuildingIndex = true;
  
  const verses: IndexedVerse[] = [];

  for (const book of bible.books) {
    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        const textLower = verse.text.toLowerCase();
        verses.push({
          book: book.name,
          bookSlug: book.slug,
          chapter: chapter.chapter,
          verse: verse.verse,
          text: verse.text,
          textLower,
          compact: normalizeSearchText(verse.text),
        });
      }
    }
  }

  searchIndex = verses;
  isBuildingIndex = false;
}

function scoreVerse(verse: IndexedVerse, queryRaw: string, terms: string[]): number {
  const query = queryRaw.toLowerCase().trim();
  if (!query) return 0;

  let score = 0;

  if (verse.textLower === query) score += 260;
  if (verse.textLower.startsWith(query)) score += 120;

  const phrasePos = verse.textLower.indexOf(query);
  if (phrasePos >= 0) {
    score += 170;
    score += Math.max(0, 40 - Math.min(phrasePos, 40));
  }

  if (terms.length > 0) {
    let matchedTerms = 0;
    for (const term of terms) {
      if (verse.compact.includes(term)) {
        matchedTerms += 1;
        score += 18;
      }
    }

    if (matchedTerms === terms.length) score += 80;
    else if (matchedTerms > 0) score += 20;
  }

  score += Math.max(0, 24 - Math.floor(verse.text.length / 12));
  return score;
}

export function search(query: string, limit: number = 50): SearchResult[] {
  const q = query.trim();
  if (q.length < 2) return [];

  const terms = getSearchTerms(q);
  const ranked: SearchResult[] = [];

  for (const item of searchIndex) {
    const score = scoreVerse(item, q, terms);
    if (score <= 0) continue;

    ranked.push({
      book: item.book,
      bookSlug: item.bookSlug,
      chapter: item.chapter,
      verse: item.verse,
      text: item.text,
      score,
    });
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.book !== b.book) return a.book.localeCompare(b.book);
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  return ranked.slice(0, limit);
}
