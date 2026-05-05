import { describe, it, expect } from "vitest";
import { ean13Bars } from "@/lib/barcode";

describe("ean13Bars", () => {
  it("produces a 95-module bar pattern for a valid EAN-13", () => {
    const result = ean13Bars("4260694670002");
    expect(result.totalWidth).toBe(95);
    expect(result.bars.length).toBeGreaterThan(20);
    expect(result.text).toBe("4260694670002");
  });

  it("each bar has positive width and stays within bounds", () => {
    const result = ean13Bars("4260694670002");
    for (const bar of result.bars) {
      expect(bar.width).toBeGreaterThan(0);
      expect(bar.x).toBeGreaterThanOrEqual(0);
      expect(bar.x + bar.width).toBeLessThanOrEqual(result.totalWidth);
    }
  });

  it("is deterministic across calls", () => {
    const a = ean13Bars("4260694670019");
    const b = ean13Bars("4260694670019");
    expect(a.bars).toEqual(b.bars);
  });

  it("throws on invalid input (jsbarcode rejects non-EAN13 codes)", () => {
    expect(() => ean13Bars("not-a-number")).toThrow();
  });
});
