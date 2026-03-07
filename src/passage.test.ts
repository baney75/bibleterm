import { describe, expect, test } from "bun:test";
import { buildCopyPayload, getVerseSelectionRange, isVerseWithinSelection } from "./passage";

describe("passage helpers", () => {
  test("builds a normalized selection range around the anchor", () => {
    expect(getVerseSelectionRange(7, null)).toEqual({ start: 7, end: 7 });
    expect(getVerseSelectionRange(7, 3)).toEqual({ start: 3, end: 7 });
    expect(getVerseSelectionRange(3, 7)).toEqual({ start: 3, end: 7 });
  });

  test("detects verses inside the active selection", () => {
    expect(isVerseWithinSelection(4, 7, 3)).toBe(true);
    expect(isVerseWithinSelection(2, 7, 3)).toBe(false);
    expect(isVerseWithinSelection(7, 7, null)).toBe(false);
  });

  test("builds a clipboard payload for multiple verses", () => {
    const copy = buildCopyPayload({
      bookName: "John",
      chapter: 3,
      translation: "KJV",
      verses: [
        { verse: 14, text: "And as Moses lifted up the serpent in the wilderness..." },
        { verse: 15, text: "That whosoever believeth in him should not perish..." },
        { verse: 16, text: "For God so loved the world..." },
      ],
    });

    expect(copy.citation).toBe("John 3:14-16 KJV");
    expect(copy.payload).toBe(
      "John 3\n\n14 And as Moses lifted up the serpent in the wilderness...\n15 That whosoever believeth in him should not perish...\n16 For God so loved the world...\n\nJohn 3:14-16 KJV"
    );
  });
});
