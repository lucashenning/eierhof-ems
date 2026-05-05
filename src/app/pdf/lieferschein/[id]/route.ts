import { NextRequest } from "next/server";
import { createElement } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderPdfBuffer, getLogoBase64 } from "@/lib/pdf-render";
import { LieferscheinDocument } from "@/pdf/Lieferschein";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const lieferschein = await prisma.lieferschein.findUnique({
    where: { id },
    include: {
      kunde: true,
      positionen: { include: { produkt: true }, orderBy: { reihenfolge: "asc" } },
    },
  });
  if (!lieferschein) return new Response("Not found", { status: 404 });
  if (user.role !== "ADMIN" && lieferschein.fahrerId !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const settings = await prisma.einstellungen.findUnique({ where: { id: "singleton" } });
  if (!settings) return new Response("Einstellungen fehlen", { status: 500 });

  const logoBase64 = await getLogoBase64();
  const doc = createElement(LieferscheinDocument, {
    nummer: lieferschein.nummer,
    datum: lieferschein.datum,
    mhd: lieferschein.mhd,
    bemerkung: lieferschein.bemerkung,
    unterschrift: lieferschein.unterschrift,
    kunde: lieferschein.kunde,
    positionen: lieferschein.positionen.map((p) => ({
      bezeichnung: p.produkt.bezeichnung,
      ean13: p.produkt.ean13,
      packungen: p.packungen,
      packungsgroesse: p.produkt.packungsgroesse,
      packungenProKiste: p.produkt.packungenProKiste,
    })),
    einstellungen: settings,
    logoBase64,
  });
  const buffer = await renderPdfBuffer(doc);
  const download = req.nextUrl.searchParams.get("download") === "1";
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${lieferschein.nummer}.pdf"`,
    },
  });
}
