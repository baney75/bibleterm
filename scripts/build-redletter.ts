#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { CANONICAL_ORDER } from "../src/data/canon";

type RedLetterData = Record<string, Record<string, string[]>>;

const RED_LETTER_PATH = path.resolve(import.meta.dir, "..", "src", "data", "red-letter.json");

function normalizeRedLetterData(data: RedLetterData): RedLetterData {
  const orderedBooks = [
    ...CANONICAL_ORDER.filter((bookSlug) => bookSlug in data),
    ...Object.keys(data)
      .filter((bookSlug) => !CANONICAL_ORDER.includes(bookSlug))
      .sort(),
  ];

  const normalized: RedLetterData = {};

  for (const bookSlug of orderedBooks) {
    const chapters = data[bookSlug];
    const sortedChapterEntries = Object.entries(chapters).sort(
      ([left], [right]) => parseInt(left, 10) - parseInt(right, 10)
    );

    normalized[bookSlug] = {};
    for (const [chapter, verses] of sortedChapterEntries) {
      if (!Array.isArray(verses)) {
        throw new Error(`Expected ${bookSlug} ${chapter} to be an array of verses`);
      }

      const normalizedVerses = Array.from(
        new Set(
          verses.map((verse) => {
            const parsed = parseInt(verse, 10);
            if (!Number.isInteger(parsed) || parsed < 1) {
              throw new Error(`Invalid red-letter verse ${bookSlug} ${chapter}:${verse}`);
            }
            return String(parsed);
          })
        )
      ).sort((left, right) => parseInt(left, 10) - parseInt(right, 10));

      normalized[bookSlug][chapter] = normalizedVerses;
    }
  }

  return normalized;
}

function hasVerse(data: RedLetterData, bookSlug: string, chapter: number, verse: number): boolean {
  return data[bookSlug]?.[String(chapter)]?.includes(String(verse)) ?? false;
}

const data = JSON.parse(readFileSync(RED_LETTER_PATH, "utf8")) as RedLetterData;
const normalized = normalizeRedLetterData(data);

const expectedRed = [
  ["john", 3, 16],
  ["john", 14, 6],
  ["revelation", 22, 20],
] as const;

for (const [bookSlug, chapter, verse] of expectedRed) {
  if (!hasVerse(normalized, bookSlug, chapter, verse)) {
    throw new Error(`Expected ${bookSlug} ${chapter}:${verse} to be red-letter`);
  }
}

if (hasVerse(normalized, "genesis", 1, 1)) {
  throw new Error("Expected genesis 1:1 to remain non-red-letter");
}

writeFileSync(RED_LETTER_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
console.log(`Normalized red-letter data: ${RED_LETTER_PATH}`);
