import type { Verse } from "./data/loader";
import type { Translation } from "./state";

export interface VerseSelectionRange {
  end: number;
  start: number;
}

export interface CopyPayload {
  citation: string;
  payload: string;
}

export function getVerseSelectionRange(
  selectedVerseIndex: number,
  anchorVerseIndex: number | null
): VerseSelectionRange {
  if (anchorVerseIndex === null) {
    return {
      start: selectedVerseIndex,
      end: selectedVerseIndex,
    };
  }

  return {
    start: Math.min(anchorVerseIndex, selectedVerseIndex),
    end: Math.max(anchorVerseIndex, selectedVerseIndex),
  };
}

export function isVerseWithinSelection(
  verseIndex: number,
  selectedVerseIndex: number,
  anchorVerseIndex: number | null
): boolean {
  if (anchorVerseIndex === null) return false;
  const range = getVerseSelectionRange(selectedVerseIndex, anchorVerseIndex);
  return verseIndex >= range.start && verseIndex <= range.end;
}

export function buildCopyPayload(input: {
  bookName: string;
  chapter: number;
  translation: Translation;
  verses: Verse[];
}): CopyPayload {
  const firstVerse = input.verses[0];
  const lastVerse = input.verses[input.verses.length - 1];

  if (!firstVerse || !lastVerse) {
    return {
      citation: `${input.bookName} ${input.chapter} ${input.translation}`,
      payload: "",
    };
  }

  const verseRange =
    firstVerse.verse === lastVerse.verse
      ? `${input.chapter}:${firstVerse.verse}`
      : `${input.chapter}:${firstVerse.verse}-${lastVerse.verse}`;

  const citation = `${input.bookName} ${verseRange} ${input.translation}`;
  const title = `${input.bookName} ${input.chapter}`;
  const body = input.verses.map((verse) => `${verse.verse} ${verse.text}`).join("\n");

  return {
    citation,
    payload: `${title}\n\n${body}\n\n${citation}`,
  };
}
