import type { Translation } from "../state";

export interface SanitizedVerseText {
  paragraphStart: boolean;
  text: string;
}

export function sanitizeVerseText(
  rawText: string,
  translation: Translation,
  chapter: number,
  verse: number
): SanitizedVerseText {
  let text = rawText.replace(/\s+/g, " ").trim();
  let paragraphStart = false;

  if (text.startsWith("¶")) {
    paragraphStart = true;
    text = text.replace(/^¶\s*/u, "");
  }

  if (translation === "KJV") {
    text = stripKjvEditorialNotes(text, chapter, verse);
  }

  if (translation === "WEB") {
    text = stripWebEditorialNotes(text, chapter, verse);
  }

  text = text.replace(/\s+/g, " ").trim();

  return {
    paragraphStart,
    text,
  };
}

function stripKjvEditorialNotes(text: string, chapter: number, verse: number): string {
  const noteStart = text.indexOf(`${chapter}.${verse} `);
  if (noteStart === -1) return text;
  return text.slice(0, noteStart).trimEnd();
}

function stripWebEditorialNotes(text: string, chapter: number, verse: number): string {
  const marker = `${chapter}:${verse} `;
  let next = text;

  while (true) {
    const noteStart = next.indexOf(marker);
    if (noteStart === -1) return next;

    const noteEnd = findSentenceBoundary(next, noteStart + marker.length);
    const before = next.slice(0, noteStart).trimEnd();
    const after = next.slice(noteEnd).trimStart();
    next = [before, after].filter(Boolean).join(" ");
  }
}

function findSentenceBoundary(text: string, start: number): number {
  for (let i = start; i < text.length; i++) {
    if (!/[.!?]/.test(text[i] ?? "")) continue;

    let boundary = i + 1;
    while (/["'”’)\]]/.test(text[boundary] ?? "")) {
      boundary += 1;
    }
    while (/\s/.test(text[boundary] ?? "")) {
      boundary += 1;
    }
    return boundary;
  }

  return text.length;
}
