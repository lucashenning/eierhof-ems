import { describe, it, expect } from "vitest";
import {
  addDays,
  toISODate,
  startOfMonth,
  endOfMonth,
  previousMonthRange,
  formatDate,
} from "@/lib/dates";

describe("addDays", () => {
  it("MHD is delivery date + 25 days (the rule from REQUIREMENTS.md)", () => {
    const datum = new Date("2026-04-15T00:00:00Z");
    const mhd = addDays(datum, 25);
    expect(mhd.toISOString().slice(0, 10)).toBe("2026-05-10");
  });

  it("crosses month boundaries", () => {
    expect(addDays(new Date("2026-01-31T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe(
      "2026-02-01"
    );
  });

  it("crosses year boundaries", () => {
    expect(addDays(new Date("2025-12-31T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe(
      "2026-01-01"
    );
  });

  it("does not mutate the input date", () => {
    const original = new Date("2026-04-15T00:00:00Z");
    const snapshot = original.toISOString();
    addDays(original, 25);
    expect(original.toISOString()).toBe(snapshot);
  });
});

describe("toISODate", () => {
  it("formats as YYYY-MM-DD in Europe/Berlin", () => {
    expect(toISODate(new Date("2026-04-15T10:00:00Z"))).toBe("2026-04-15");
  });
});

describe("month boundaries", () => {
  it("startOfMonth returns day 1 at 00:00 UTC", () => {
    const d = startOfMonth(new Date("2026-04-15T12:00:00Z"));
    expect(d.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("endOfMonth returns the last day at 23:59:59.999 UTC", () => {
    const d = endOfMonth(new Date("2026-04-15T12:00:00Z"));
    expect(d.toISOString()).toBe("2026-04-30T23:59:59.999Z");
  });

  it("previousMonthRange covers the full previous calendar month", () => {
    const { from, to } = previousMonthRange(new Date("2026-04-15T12:00:00Z"));
    expect(from.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-03-31T23:59:59.999Z");
  });
});

describe("formatDate", () => {
  it("renders dd.mm.yyyy in de-DE", () => {
    expect(formatDate(new Date("2026-04-15T00:00:00Z"))).toBe("15.04.2026");
  });
});
