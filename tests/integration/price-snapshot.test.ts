import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { prisma, resetTransactionalRows, ensureFixtures, makeKunde, Decimal } from "./db";

let fahrerId: string;
let p10Id: string;
let p6Id: string;
let p10StandardOriginal: string;

beforeAll(async () => {
  const f = await ensureFixtures();
  fahrerId = f.fahrer.id;
  p10Id = f.p10.id;
  p6Id = f.p6.id;
  p10StandardOriginal = f.p10.standardpreis.toString();
});

beforeEach(async () => {
  await resetTransactionalRows();
  // Reset p10 standardpreis to its known value in case a prior test ran
  await prisma.produkt.update({
    where: { id: p10Id },
    data: { standardpreis: new Decimal(p10StandardOriginal) },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createLieferscheinUsingResolution(opts: {
  kundeId: string;
  produktId: string;
  packungen: number;
}) {
  // Mirror the resolution rule from src/app/(app)/lieferscheine/actions.ts:
  //   sonderpreis ?? standardpreis  →  snapshotted into LieferscheinPosition.preis
  const sonder = await prisma.kundeProduktPreis.findUnique({
    where: { kundeId_produktId: { kundeId: opts.kundeId, produktId: opts.produktId } },
  });
  const produkt = await prisma.produkt.findUniqueOrThrow({ where: { id: opts.produktId } });
  const preis = sonder?.sonderpreis ?? produkt.standardpreis;

  const datum = new Date("2026-04-15T00:00:00Z");
  const mhd = new Date("2026-05-10T00:00:00Z");

  return prisma.lieferschein.create({
    data: {
      nummer: "LS-TEST-" + Math.random().toString(36).slice(2, 8),
      kundeId: opts.kundeId,
      fahrerId,
      datum,
      mhd,
      status: "Unterschrieben",
      unterschrift: "data:image/png;base64,xxx",
      positionen: { create: [{ produktId: opts.produktId, packungen: opts.packungen, preis, reihenfolge: 0 }] },
    },
    include: { positionen: true },
  });
}

describe("LieferscheinPosition.preis snapshot rule", () => {
  it("uses Produkt.standardpreis when no Sonderpreis is set", async () => {
    const kunde = await makeKunde({ kuerzel: "K1" });
    const ls = await createLieferscheinUsingResolution({
      kundeId: kunde.id,
      produktId: p10Id,
      packungen: 5,
    });
    expect(ls.positionen[0].preis.equals(new Decimal("2.65"))).toBe(true);
  });

  it("uses KundeProduktPreis.sonderpreis when one is set", async () => {
    const kunde = await makeKunde({ kuerzel: "K2" });
    await prisma.kundeProduktPreis.create({
      data: { kundeId: kunde.id, produktId: p10Id, sonderpreis: new Decimal("2.40") },
    });
    const ls = await createLieferscheinUsingResolution({
      kundeId: kunde.id,
      produktId: p10Id,
      packungen: 5,
    });
    expect(ls.positionen[0].preis.equals(new Decimal("2.40"))).toBe(true);
  });

  it("does NOT change the snapshot when Sonderpreis is updated later", async () => {
    const kunde = await makeKunde({ kuerzel: "K3" });
    await prisma.kundeProduktPreis.create({
      data: { kundeId: kunde.id, produktId: p10Id, sonderpreis: new Decimal("2.40") },
    });
    const ls = await createLieferscheinUsingResolution({
      kundeId: kunde.id,
      produktId: p10Id,
      packungen: 5,
    });

    // After delivery: customer renegotiates a new price
    await prisma.kundeProduktPreis.update({
      where: { kundeId_produktId: { kundeId: kunde.id, produktId: p10Id } },
      data: { sonderpreis: new Decimal("2.20") },
    });

    const reread = await prisma.lieferschein.findUniqueOrThrow({
      where: { id: ls.id },
      include: { positionen: true },
    });
    expect(reread.positionen[0].preis.equals(new Decimal("2.40"))).toBe(true);
  });

  it("does NOT change the snapshot when Produkt.standardpreis is updated later", async () => {
    const kunde = await makeKunde({ kuerzel: "K4" });
    const ls = await createLieferscheinUsingResolution({
      kundeId: kunde.id,
      produktId: p10Id,
      packungen: 5,
    });
    await prisma.produkt.update({
      where: { id: p10Id },
      data: { standardpreis: new Decimal("2.99") },
    });
    const reread = await prisma.lieferschein.findUniqueOrThrow({
      where: { id: ls.id },
      include: { positionen: true },
    });
    expect(reread.positionen[0].preis.equals(new Decimal("2.65"))).toBe(true);
  });
});

describe("Lieferschein → Kunde / Fahrer onDelete: Restrict", () => {
  it("blocks deletion of a Kunde that still has Lieferscheine", async () => {
    const kunde = await makeKunde({ kuerzel: "KH" });
    await createLieferscheinUsingResolution({
      kundeId: kunde.id,
      produktId: p6Id,
      packungen: 3,
    });
    await expect(prisma.kunde.delete({ where: { id: kunde.id } })).rejects.toThrow();
  });

  it("blocks deletion of a Fahrer (User) that still has Lieferscheine", async () => {
    const kunde = await makeKunde({ kuerzel: "KI" });
    await createLieferscheinUsingResolution({
      kundeId: kunde.id,
      produktId: p6Id,
      packungen: 3,
    });
    await expect(prisma.user.delete({ where: { id: fahrerId } })).rejects.toThrow();
  });
});
