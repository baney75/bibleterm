import { describe, expect, test } from "bun:test";
import { sanitizeVerseText } from "./sanitize";

describe("sanitizeVerseText", () => {
  test("removes KJV paragraph markers and trailing editorial notes", () => {
    const verse = sanitizeVerseText(
      "¶ And they journeyed from Beth-el; and there was but a little way to come to Ephrath: and Rachel travailed, and she had hard labour.35.16 a little…: Heb. a little piece of ground",
      "KJV",
      35,
      16
    );

    expect(verse.paragraphStart).toBe(true);
    expect(verse.text).toBe(
      "And they journeyed from Beth-el; and there was but a little way to come to Ephrath: and Rachel travailed, and she had hard labour."
    );
  });

  test("removes inline WEB footnotes while preserving the verse text", () => {
    const verse = sanitizeVerseText(
      "For God so loved the world, that he gave his only born3:16 The phrase “only born” is from the Greek word “μονογενη”, which is sometimes translated “only begotten” or “one and only”. Son, that whoever believes in him should not perish, but have eternal life.",
      "WEB",
      3,
      16
    );

    expect(verse.paragraphStart).toBe(false);
    expect(verse.text).toBe(
      "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life."
    );
  });

  test("removes stacked WEB footnotes in the same verse", () => {
    const verse = sanitizeVerseText(
      "The vision of Obadiah. This is what the Lord1:1 The word translated “Lord” is “Adonai.” Yahweh1:1 “Yahweh” is God’s proper Name, sometimes rendered “LORD” (all caps) in other translations. says about Edom.",
      "WEB",
      1,
      1
    );

    expect(verse.text).toBe(
      "The vision of Obadiah. This is what the Lord Yahweh says about Edom."
    );
  });

  test("leaves KJV text unchanged when no editorial notes are present", () => {
    const verse = sanitizeVerseText(
      "In the beginning God created the heaven and the earth.",
      "KJV",
      1,
      1
    );

    expect(verse.text).toBe("In the beginning God created the heaven and the earth.");
  });
});
