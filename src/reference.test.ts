import { describe, expect, test } from "bun:test";
import { parseReferenceInput } from "./reference";
import type { Book } from "./data/loader";

const books: Book[] = [
  { name: "Genesis", slug: "genesis", abbreviation: "gen", chapters: [] },
  { name: "John", slug: "john", abbreviation: "jhn", chapters: [] },
  { name: "1 John", slug: "1john", abbreviation: "1jn", chapters: [] },
  {
    name: "Song of Solomon",
    slug: "song-of-solomon",
    abbreviation: "sos",
    chapters: [],
  },
];

describe("parseReferenceInput", () => {
  test("parses a full reference", () => {
    expect(parseReferenceInput("john 3:16", books)).toEqual({
      bookSlug: "john",
      chapter: 3,
      verse: 16,
    });
  });

  test("accepts common abbreviations", () => {
    expect(parseReferenceInput("jn 1:1", books)).toEqual({
      bookSlug: "john",
      chapter: 1,
      verse: 1,
    });

    expect(parseReferenceInput("1 jn 4:8", books)).toEqual({
      bookSlug: "1john",
      chapter: 4,
      verse: 8,
    });
  });

  test("resolves aliases like song", () => {
    expect(parseReferenceInput("song 2:1", books)).toEqual({
      bookSlug: "song-of-solomon",
      chapter: 2,
      verse: 1,
    });
  });

  test("rejects invalid inputs", () => {
    expect(parseReferenceInput("john", books)).toBeNull();
    expect(parseReferenceInput("john 0:1", books)).toBeNull();
    expect(parseReferenceInput("unknown 1:1", books)).toBeNull();
  });
});
