import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { prisma, resetTransactionalRows, ensureFixtures } from "./db";
import { nextLieferscheinNummer, nextRechnungNummer } from "@/lib/numbering";

beforeAll(async () => {
  await ensureFixtures();
});

beforeEach(async () => {
  await resetTransactionalRows();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("nextLieferscheinNummer", () => {
  it("formats as LS<yy><5-digit lfdNr>, starting at 00001 for the year", async () => {
    expect(await nextLieferscheinNummer(2026)).toBe("LS2600001");
    expect(await nextLieferscheinNummer(2026)).toBe("LS2600002");
    expect(await nextLieferscheinNummer(2026)).toBe("LS2600003");
  });

  it("uses an independent counter per year", async () => {
    expect(await nextLieferscheinNummer(2026)).toBe("LS2600001");
    expect(await nextLieferscheinNummer(2027)).toBe("LS2700001");
    expect(await nextLieferscheinNummer(2026)).toBe("LS2600002");
  });
});

describe("nextRechnungNummer", () => {
  it("formats as <kuerzel><yy><4-digit lfdNr>, starting at 0001 for the year", async () => {
    expect(await nextRechnungNummer("ME", 2026)).toBe("ME260001");
    expect(await nextRechnungNummer("ME", 2026)).toBe("ME260002");
  });

  it("shares the lfdNr counter across customers within a year", async () => {
    expect(await nextRechnungNummer("AL", 2026)).toBe("AL260001");
    expect(await nextRechnungNummer("ME", 2026)).toBe("ME260002");
    expect(await nextRechnungNummer("EF", 2026)).toBe("EF260003");
  });

  it("uses an independent counter per year", async () => {
    expect(await nextRechnungNummer("AM", 2026)).toBe("AM260001");
    expect(await nextRechnungNummer("AM", 2027)).toBe("AM270001");
    expect(await nextRechnungNummer("AM", 2026)).toBe("AM260002");
  });

  it("normalises kuerzel to 2 uppercase characters, padding short input with X", async () => {
    expect(await nextRechnungNummer("a", 2026)).toBe("AX260001");
    expect(await nextRechnungNummer("", 2026)).toBe("XX260002");
  });
});
