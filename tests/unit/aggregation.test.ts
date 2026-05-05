import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { aggregateLieferscheine } from "@/lib/aggregation";

const Decimal = Prisma.Decimal;

// Helper: build a fixture Lieferschein-like object that satisfies
// the Prisma payload type aggregateLieferscheine expects.
type Fixture = Parameters<typeof aggregateLieferscheine>[0][number];

function makePosition(opts: {
  produktId: string;
  bezeichnung: string;
  ean13: string;
  packungen: number;
  preis: string;
  packungsgroesse: number;
  packungenProKiste?: number;
  mwstSatz?: string;
}): Fixture["positionen"][number] {
  const now = new Date();
  return {
    id: "pos-" + opts.ean13,
    lieferscheinId: "ls-1",
    produktId: opts.produktId,
    packungen: opts.packungen,
    preis: new Decimal(opts.preis),
    reihenfolge: 0,
    produkt: {
      id: opts.produktId,
      bezeichnung: opts.bezeichnung,
      ean13: opts.ean13,
      standardpreis: new Decimal(opts.preis),
      mwstSatz: new Decimal(opts.mwstSatz ?? "7"),
      einheit: "Packung",
      packungsgroesse: opts.packungsgroesse,
      packungenProKiste: opts.packungenProKiste ?? 21,
      reihenfolge: 0,
      aktiv: true,
      createdAt: now,
      updatedAt: now,
    },
  };
}

function makeLieferschein(datum: string, positionen: Fixture["positionen"]): Fixture {
  const now = new Date();
  return {
    id: "ls-" + datum,
    nummer: "LS-TEST",
    kundeId: "kunde-1",
    fahrerId: "fahrer-1",
    datum: new Date(datum + "T00:00:00Z"),
    mhd: new Date(datum + "T00:00:00Z"),
    status: "Unterschrieben",
    unterschrift: null,
    bemerkung: null,
    createdAt: now,
    updatedAt: now,
    positionen,
  };
}

describe("aggregateLieferscheine — eier package buckets", () => {
  it("regression: 0/0/0/0 bug — populates 10er/6er/4er based on packungsgroesse", () => {
    const ls = makeLieferschein("2026-04-15", [
      makePosition({
        produktId: "p10",
        bezeichnung: "Eier Kl. A L br. Freil. (10er)",
        ean13: "4260694670002",
        packungen: 42,
        preis: "2.65",
        packungsgroesse: 10,
      }),
      makePosition({
        produktId: "p6",
        bezeichnung: "Eier Kl. A L br. Freil. (6er)",
        ean13: "4260694670019",
        packungen: 30,
        preis: "1.59",
        packungsgroesse: 6,
      }),
      makePosition({
        produktId: "p4",
        bezeichnung: "Eier Kl. A XL br. Freil. (4er)",
        ean13: "4260694670057",
        packungen: 21,
        preis: "1.32",
        packungsgroesse: 4,
      }),
    ]);

    const agg = aggregateLieferscheine([ls]);

    expect(agg.zusammenfassung.eier10er).toBe(420);
    expect(agg.zusammenfassung.eier6er).toBe(180);
    expect(agg.zusammenfassung.eier4er).toBe(84);
    expect(agg.zusammenfassung.summeEier).toBe(684);
  });

  it("matches the Görge sample from styles/samples/rechnung.pdf (8 deliveries → 6500/1620/504/8624)", () => {
    // Reproducing the per-delivery Mengen from the sample invoice (Edeka Görge Melverode)
    // file: styles/samples/rechnungen/Melverode 102637.pdf — known totals at the foot of page 2.
    const dates = ["2026-02-02", "2026-02-05", "2026-02-09", "2026-02-12", "2026-02-16", "2026-02-19", "2026-02-23", "2026-02-26"];
    const perDay: { p10?: number; p10M?: number; p6?: number; p6M?: number; p4?: number }[] = [
      { p10: 42, p6: 30, p4: 21 },
      { p10: 63, p6M: 30, p4: 21 },
      { p10: 63, p10M: 42, p6: 30, p6M: 30, p4: 21 },
      { p10: 63, p10M: 42, p6M: 30, p4: 0 },
      { p10: 63, p10M: 21, p6: 30, p4: 21 },
      { p10: 63, p10M: 21, p6M: 30, p4: 21 },
      { p10: 63, p10M: 21, p6: 30, p4: 0 },
      { p10: 62, p10M: 21, p6M: 30, p4: 21 },
    ];
    const fixtures = dates.map((d, i) => {
      const day = perDay[i];
      const positions: Fixture["positionen"] = [];
      if (day.p10) positions.push(makePosition({ produktId: "p10L", bezeichnung: "Eier Kl. A L br. Freil. (10er)", ean13: "4260694670002", packungen: day.p10, preis: "2.65", packungsgroesse: 10 }));
      if (day.p10M) positions.push(makePosition({ produktId: "p10M", bezeichnung: "Eier Kl. A M br. Freil. (10er)", ean13: "4260694670026", packungen: day.p10M, preis: "2.45", packungsgroesse: 10 }));
      if (day.p6) positions.push(makePosition({ produktId: "p6L", bezeichnung: "Eier Kl. A L br. Freil. (6er)", ean13: "4260694670019", packungen: day.p6, preis: "1.59", packungsgroesse: 6 }));
      if (day.p6M) positions.push(makePosition({ produktId: "p6M", bezeichnung: "Eier Kl. A M br. Freil. (6er)", ean13: "4260694670033", packungen: day.p6M, preis: "1.47", packungsgroesse: 6 }));
      if (day.p4) positions.push(makePosition({ produktId: "p4XL", bezeichnung: "Eier Kl. A XL br. Freil. (4er)", ean13: "4260694670057", packungen: day.p4, preis: "1.32", packungsgroesse: 4 }));
      return makeLieferschein(d, positions);
    });

    const agg = aggregateLieferscheine(fixtures);
    expect(agg.zusammenfassung.eier10er).toBe(6500);
    expect(agg.zusammenfassung.eier6er).toBe(1620);
    expect(agg.zusammenfassung.eier4er).toBe(504);
    expect(agg.zusammenfassung.summeEier).toBe(8624);
  });

  it("totals net + 7% VAT match the Görge sample (2266,52 / 158,66 / 2425,18)", () => {
    // Same fixture values as the previous test compute to the published totals.
    const dates = ["2026-02-02", "2026-02-05", "2026-02-09", "2026-02-12", "2026-02-16", "2026-02-19", "2026-02-23", "2026-02-26"];
    const perDay: { p10?: number; p10M?: number; p6?: number; p6M?: number; p4?: number }[] = [
      { p10: 42, p6: 30, p4: 21 },
      { p10: 63, p6M: 30, p4: 21 },
      { p10: 63, p10M: 42, p6: 30, p6M: 30, p4: 21 },
      { p10: 63, p10M: 42, p6M: 30, p4: 0 },
      { p10: 63, p10M: 21, p6: 30, p4: 21 },
      { p10: 63, p10M: 21, p6M: 30, p4: 21 },
      { p10: 63, p10M: 21, p6: 30, p4: 0 },
      { p10: 62, p10M: 21, p6M: 30, p4: 21 },
    ];
    const fixtures = dates.map((d, i) => {
      const day = perDay[i];
      const positions: Fixture["positionen"] = [];
      if (day.p10) positions.push(makePosition({ produktId: "p10L", bezeichnung: "Eier Kl. A L br. Freil. (10er)", ean13: "4260694670002", packungen: day.p10, preis: "2.65", packungsgroesse: 10 }));
      if (day.p10M) positions.push(makePosition({ produktId: "p10M", bezeichnung: "Eier Kl. A M br. Freil. (10er)", ean13: "4260694670026", packungen: day.p10M, preis: "2.45", packungsgroesse: 10 }));
      if (day.p6) positions.push(makePosition({ produktId: "p6L", bezeichnung: "Eier Kl. A L br. Freil. (6er)", ean13: "4260694670019", packungen: day.p6, preis: "1.59", packungsgroesse: 6 }));
      if (day.p6M) positions.push(makePosition({ produktId: "p6M", bezeichnung: "Eier Kl. A M br. Freil. (6er)", ean13: "4260694670033", packungen: day.p6M, preis: "1.47", packungsgroesse: 6 }));
      if (day.p4) positions.push(makePosition({ produktId: "p4XL", bezeichnung: "Eier Kl. A XL br. Freil. (4er)", ean13: "4260694670057", packungen: day.p4, preis: "1.32", packungsgroesse: 4 }));
      return makeLieferschein(d, positions);
    });

    const agg = aggregateLieferscheine(fixtures);
    expect(agg.netto.toString()).toBe("2266.52");
    expect(agg.mwst7.toString()).toBe("158.66");
    expect(agg.brutto.toString()).toBe("2425.18");
  });

  it("splits 7% and 19% MwSt buckets when both product types are present (eggs + Likör)", () => {
    const ls = makeLieferschein("2026-04-15", [
      makePosition({ produktId: "p10", bezeichnung: "Eier Kl. A L br. Freil. (10er)", ean13: "4260694670002", packungen: 10, preis: "2.65", packungsgroesse: 10, mwstSatz: "7" }),
      makePosition({ produktId: "lq", bezeichnung: "Eierlikör 0,7 L", ean13: "4260694670064", packungen: 2, preis: "14.95", packungsgroesse: 1, mwstSatz: "19" }),
    ]);
    const agg = aggregateLieferscheine([ls]);
    // Decimal.toString() drops trailing zeros, so compare values not strings.
    expect(agg.netto.equals("56.40")).toBe(true);     // 26.50 + 29.90
    expect(agg.mwst7.equals("1.86")).toBe(true);       // 7% on 26.50, HALF_UP from 1.855
    expect(agg.mwst19.equals("5.68")).toBe(true);      // 19% on 29.90, HALF_UP from 5.681
    expect(agg.brutto.equals("63.94")).toBe(true);
  });

  it("groups positions by Lieferdatum in chronological order", () => {
    const ls1 = makeLieferschein("2026-02-26", [
      makePosition({ produktId: "p10", bezeichnung: "Eier Kl. A L br. Freil. (10er)", ean13: "4260694670002", packungen: 10, preis: "2.65", packungsgroesse: 10 }),
    ]);
    const ls2 = makeLieferschein("2026-02-02", [
      makePosition({ produktId: "p6", bezeichnung: "Eier Kl. A L br. Freil. (6er)", ean13: "4260694670019", packungen: 5, preis: "1.59", packungsgroesse: 6 }),
    ]);
    const agg = aggregateLieferscheine([ls1, ls2]);
    expect(agg.groups.map((g) => g.lieferdatum.toISOString().slice(0, 10))).toEqual([
      "2026-02-02",
      "2026-02-26",
    ]);
  });
});
