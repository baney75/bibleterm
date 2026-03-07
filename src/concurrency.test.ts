import { describe, expect, test } from "bun:test";
import { runWithConcurrency } from "./concurrency";

describe("runWithConcurrency", () => {
  test("runs every item exactly once and waits for the slowest task", async () => {
    const items = Array.from({ length: 12 }, (_, index) => index);
    const seen = new Map<number, number>();
    let active = 0;
    let peak = 0;

    const started = Date.now();
    await runWithConcurrency(items, 3, async (item) => {
      active += 1;
      peak = Math.max(peak, active);
      seen.set(item, (seen.get(item) ?? 0) + 1);

      await Bun.sleep(item === items[items.length - 1] ? 60 : 10);

      active -= 1;
    });
    const elapsed = Date.now() - started;

    expect(peak).toBeLessThanOrEqual(3);
    expect(seen.size).toBe(items.length);
    expect(Array.from(seen.values()).every((count) => count === 1)).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(60);
  });
});
