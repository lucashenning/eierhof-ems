import { Prisma } from "@prisma/client";
import { createElement } from "react";
import { renderPdfBuffer, getLogoBase64 } from "@/lib/pdf-render";
import { prisma } from "@/lib/db";
import { RechnungDocument } from "@/pdf/Rechnung";
import { aggregateLieferscheine } from "@/lib/aggregation";

export { aggregateLieferscheine } from "@/lib/aggregation";

type RechnungWithRelations = Prisma.RechnungGetPayload<{
  include: {
    kunde: true;
    lieferscheine: {
      include: {
        positionen: { include: { produkt: true } };
      };
    };
  };
}>;

export async function renderRechnungBuffer(rechnung: RechnungWithRelations) {
  const settings = await prisma.einstellungen.findUnique({ where: { id: "singleton" } });
  if (!settings) throw new Error("Einstellungen fehlen.");
  const logoBase64 = await getLogoBase64();

  const agg = aggregateLieferscheine(rechnung.lieferscheine);

  const doc = createElement(RechnungDocument, {
    nummer: rechnung.nummer,
    datum: rechnung.datum,
    kunde: rechnung.kunde,
    groups: agg.groups,
    netto: agg.netto,
    mwst7: agg.mwst7,
    mwst19: agg.mwst19,
    brutto: agg.brutto,
    zusammenfassung: agg.zusammenfassung,
    einstellungen: settings,
    logoBase64,
  });
  return renderPdfBuffer(doc);
}
