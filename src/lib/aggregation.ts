import { Prisma } from "@prisma/client";

const Decimal = Prisma.Decimal;

export type ZeitraumPositions = {
  groups: {
    lieferdatum: Date;
    positionen: {
      bezeichnung: string;
      ean13: string;
      packungen: number;
      einzelpreis: Prisma.Decimal;
      gesamtpreis: Prisma.Decimal;
      packungsgroesse: number;
    }[];
  }[];
  netto: Prisma.Decimal;
  mwst7: Prisma.Decimal;
  mwst19: Prisma.Decimal;
  brutto: Prisma.Decimal;
  zusammenfassung: { eier10er: number; eier6er: number; eier4er: number; summeEier: number };
};

export function aggregateLieferscheine(
  lieferscheine: Prisma.LieferscheinGetPayload<{
    include: { positionen: { include: { produkt: true } } };
  }>[]
): ZeitraumPositions {
  const sorted = [...lieferscheine].sort((a, b) => a.datum.getTime() - b.datum.getTime());

  const groups = sorted.map((l) => ({
    lieferdatum: l.datum,
    positionen: l.positionen.map((p) => ({
      bezeichnung: `${p.produkt.bezeichnung}`,
      ean13: p.produkt.ean13,
      packungen: p.packungen,
      einzelpreis: p.preis,
      gesamtpreis: new Decimal(p.preis).mul(p.packungen),
      packungsgroesse: p.produkt.packungsgroesse,
      mwstSatz: p.produkt.mwstSatz,
    })),
  }));

  let netto = new Decimal(0);
  let mwst7 = new Decimal(0);
  let mwst19 = new Decimal(0);

  let eier10er = 0;
  let eier6er = 0;
  let eier4er = 0;

  for (const g of groups) {
    for (const p of g.positionen) {
      const ges = new Decimal(p.gesamtpreis);
      netto = netto.plus(ges);
      const satz = new Decimal(p.mwstSatz);
      const tax = ges.mul(satz).div(100);
      if (Number(satz) === 7) mwst7 = mwst7.plus(tax);
      else if (Number(satz) === 19) mwst19 = mwst19.plus(tax);

      const stueck = p.packungen * p.packungsgroesse;
      if (p.bezeichnung.includes("(10er)") || p.packungsgroesse === 10) eier10er += stueck;
      else if (p.bezeichnung.includes("(6er)") || p.packungsgroesse === 6) eier6er += stueck;
      else if (p.bezeichnung.includes("(4er)") || p.packungsgroesse === 4) eier4er += stueck;
    }
  }

  const round2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  netto = round2(netto);
  mwst7 = round2(mwst7);
  mwst19 = round2(mwst19);
  const brutto = round2(netto.plus(mwst7).plus(mwst19));

  return {
    groups: groups.map((g) => ({
      lieferdatum: g.lieferdatum,
      positionen: g.positionen.map(({ mwstSatz: _m, ...rest }) => rest),
    })),
    netto,
    mwst7,
    mwst19,
    brutto,
    zusammenfassung: {
      eier10er,
      eier6er,
      eier4er,
      summeEier: eier10er + eier6er + eier4er,
    },
  };
}
