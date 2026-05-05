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
  it("formats as EG<kuerzel><6-digit lfdNr>, starting at 100001", async () => {
    expect(await nextRechnungNummer("ME")).toBe("EGME100001");
    expect(await nextRechnungNummer("ME")).toBe("EGME100002");
  });

  it("uses a global counter (lfdNr is shared across customers)", async () => {
    expect(await nextRechnungNummer("AL")).toBe("EGAL100001");
    expect(await nextRechnungNummer("ME")).toBe("EGME100002");
    expect(await nextRechnungNummer("EF")).toBe("EGEF100003");
  });

  it("normalises kuerzel to 2 uppercase characters, padding short input with X", async () => {
    expect(await nextRechnungNummer("a")).toBe("EGAX100001");
    expect(await nextRechnungNummer("")).toBe("EGXX100002");
  });
});
