import { describe, it, expect } from "vitest";
import { parseGermanDecimal, formatEur, formatNum, multiply, add, toDecimal } from "@/lib/money";

describe("parseGermanDecimal", () => {
  it("parses comma decimals like '2,65'", () => {
    expect(parseGermanDecimal("2,65")?.toString()).toBe("2.65");
  });

  it("parses thousands-separator + decimals like '1.234,56'", () => {
    expect(parseGermanDecimal("1.234,56")?.toString()).toBe("1234.56");
  });

  it("regression: dot-decimal like '8.95' is parsed as 8.95, NOT 895", () => {
    // Bug we hit when admin types prices with a US-keyboard '.'
    expect(parseGermanDecimal("8.95")?.toString()).toBe("8.95");
    expect(parseGermanDecimal("14.95")?.toString()).toBe("14.95");
    expect(parseGermanDecimal("2.65")?.toString()).toBe("2.65");
  });

  it("parses '1,234.56' (comma thousands, dot decimal) just in case", () => {
    expect(parseGermanDecimal("1,234.56")?.toString()).toBe("1234.56");
  });

  it("parses plain integers", () => {
    expect(parseGermanDecimal("19")?.toString()).toBe("19");
  });

  it("trims whitespace", () => {
    expect(parseGermanDecimal("  3,99  ")?.toString()).toBe("3.99");
  });

  it("returns null on empty input", () => {
    expect(parseGermanDecimal("")).toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseGermanDecimal("abc")).toBeNull();
    expect(parseGermanDecimal("2,65 €")).toBeNull();
    expect(parseGermanDecimal("12,3,4")).toBeNull();
  });

  it("accepts negative values", () => {
    expect(parseGermanDecimal("-2,50")?.toString()).toBe("-2.5");
  });
});

describe("formatEur / formatNum", () => {
  it("formats euros with German thousands grouping", () => {
    // de-DE Intl uses NBSP (U+00A0) before €; assert via decoded form
    expect(formatEur("1234.56").replace(/\s/g, " ")).toBe("1.234,56 €");
  });

  it("rounds to 2 decimals", () => {
    expect(formatNum("1.999")).toBe("2,00");
  });

  it("formats zero", () => {
    expect(formatNum(0)).toBe("0,00");
  });
});

describe("Decimal math helpers", () => {
  it("multiply produces the expected product (de-DE display rounds to 2 decimals)", () => {
    // Decimal.toString() drops trailing zeros — match by value, not string repr
    expect(multiply("2.65", 42).equals("111.3")).toBe(true);
    expect(formatNum(multiply("2.65", 42))).toBe("111,30");
  });

  it("add chains correctly", () => {
    const sum = add(add("111.30", "47.70"), "27.72");
    expect(sum.equals("186.72")).toBe(true);
  });

  it("toDecimal accepts string, number, Decimal", () => {
    expect(toDecimal("1.5").toString()).toBe("1.5");
    expect(toDecimal(2.25).toString()).toBe("2.25");
    expect(toDecimal(toDecimal("3")).toString()).toBe("3");
  });
});
