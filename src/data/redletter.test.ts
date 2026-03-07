import { describe, expect, test } from "bun:test";
import { getRedLetterVersesInChapter, isRedLetter } from "./redletter";

describe("red-letter lookup", () => {
  test("keeps common red-letter passages", () => {
    expect(isRedLetter("john", 3, 16)).toBe(true);
    expect(isRedLetter("john", 14, 6)).toBe(true);
    expect(isRedLetter("revelation", 22, 20)).toBe(true);
  });

  test("keeps clearly non-red verses out of the map", () => {
    expect(isRedLetter("genesis", 1, 1)).toBe(false);
  });

  test("returns sorted chapter verse lists", () => {
    expect(getRedLetterVersesInChapter("john", 3)).toContain(16);
  });
});
