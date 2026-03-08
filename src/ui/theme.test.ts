import { describe, expect, test } from "bun:test";
import { DEFAULT_THEME, getTheme, getThemeOptions } from "./theme";

describe("theme registry", () => {
  test("exposes a stable default theme", () => {
    expect(DEFAULT_THEME).toBe("midnight");
    expect(getTheme(DEFAULT_THEME).label).toBe("Midnight");
  });

  test("lists selectable themes for the app-wide picker", () => {
    expect(getThemeOptions().map((theme) => theme.name)).toEqual([
      "midnight",
      "sandstone",
      "forest",
    ]);
  });
});
