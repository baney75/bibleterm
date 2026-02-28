import { describe, expect, test } from "bun:test";
import { buildSearchIndex, getSearchTerms, search } from "./search";
import type { Bible } from "./data/loader";

const bible: Bible = {
  translation: "ASV",
  books: [
    {
      name: "Genesis",
      slug: "genesis",
      abbreviation: "gen",
      chapters: [
        {
          chapter: 1,
          verses: [{ verse: 1, text: "In the beginning God created the heavens and the earth." }],
        },
      ],
    },
    {
      name: "John",
      slug: "john",
      abbreviation: "jhn",
      chapters: [
        {
          chapter: 3,
          verses: [
            { verse: 16, text: "For God so loved the world, that he gave his only begotten Son." },
            { verse: 17, text: "For God sent not the Son into the world to judge the world." },
          ],
        },
        {
          chapter: 11,
          verses: [{ verse: 35, text: "Jesus wept." }],
        },
      ],
    },
  ],
};

describe("search", () => {
  test("normalizes query terms", () => {
    expect(getSearchTerms("For, GOD! so loved")).toEqual(["for", "god", "so", "loved"]);
  });

  test("returns best-ranked exact/phrase matches first", () => {
    buildSearchIndex(bible);
    const results = search("jesus wept", 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.bookSlug).toBe("john");
    expect(results[0]?.chapter).toBe(11);
    expect(results[0]?.verse).toBe(35);
  });

  test("respects result limit", () => {
    buildSearchIndex(bible);
    const results = search("for god", 1);
    expect(results).toHaveLength(1);
  });

  test("ignores very short queries", () => {
    buildSearchIndex(bible);
    expect(search("a", 10)).toEqual([]);
  });
});
