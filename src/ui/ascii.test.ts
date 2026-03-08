import { describe, expect, test } from "bun:test";
import {
  FALLBACK_WORDMARK,
  HEADER_BANNER,
  SPLASH_BANNER,
  renderHeaderBanner,
  renderSplashBanner,
  shouldShowSplash,
} from "./ascii";

function isPrintableAscii(text: string): boolean {
  return /^[\x20-\x7e\n]+$/.test(text);
}

describe("ascii branding", () => {
  test("generated banners are printable ASCII", () => {
    expect(isPrintableAscii(HEADER_BANNER)).toBe(true);
    expect(isPrintableAscii(SPLASH_BANNER)).toBe(true);
  });

  test("header banner falls back on smaller terminals", () => {
    expect(renderHeaderBanner(80, 24)).toBe(FALLBACK_WORDMARK);
    expect(renderHeaderBanner(96, 28)).toBe(HEADER_BANNER);
  });

  test("splash banner honors size thresholds", () => {
    expect(renderSplashBanner(80, 24)).toBe(FALLBACK_WORDMARK);
    expect(renderSplashBanner(100, 30)).toBe(SPLASH_BANNER);
  });

  test("splash opt-out disables the startup banner", () => {
    expect(shouldShowSplash(100, 30, {})).toBe(true);
    expect(shouldShowSplash(100, 30, { BTERM_NO_SPLASH: "1" })).toBe(false);
  });
});
