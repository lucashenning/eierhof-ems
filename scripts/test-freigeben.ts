import { PrismaClient, Prisma } from "@prisma/client";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import fs from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import { RechnungDocument } from "../src/pdf/Rechnung";
import { LieferscheinDocument } from "../src/pdf/Lieferschein";

const prisma = new PrismaClient();
const Decimal = Prisma.Decimal;

async function loadLogoBase64() {
  const file = await fs.readFile(path.join(process.cwd(), "public", "logo.png"));
  return `data:image/png;base64,${file.toString("base64")}`;
}

async function storePdf(nummer: string, bytes: Buffer) {
  const dir = path.resolve(process.cwd(), "tmp", "rechnungen");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${nummer}.pdf`);
  await fs.writeFile(filePath, bytes);
  return `file://${filePath}`;
}

async function main() {
  const settings = await prisma.einstellungen.findUniqueOrThrow({ where: { id: "singleton" } });
  const logoBase64 = await loadLogoBase64();

  // 1. Lieferschein PDF render via the document directly
  const ls = await prisma.lieferschein.findFirstOrThrow({
    include: { kunde: true, positionen: { include: { produkt: true }, orderBy: { reihenfolge: "asc" } } },
  });
  const lsBuffer = await renderToBuffer(
    createElement(LieferscheinDocument, {
      nummer: ls.nummer,
      datum: ls.datum,
      mhd: ls.mhd,
      bemerkung: ls.bemerkung,
      unterschrift: ls.unterschrift,
      kunde: ls.kunde,
      positionen: ls.positionen.map((p) => ({
        bezeichnung: p.produkt.bezeichnung,
        ean13: p.produkt.ean13,
        packungen: p.packungen,
        packungsgroesse: p.produkt.packungsgroesse,
        packungenProKiste: p.produkt.packungenProKiste,
      })),
      einstellungen: settings,
      logoBase64,
    })
  );
  console.log(`Lieferschein PDF: ${lsBuffer.length} bytes (${ls.nummer})`);
  await fs.writeFile("/tmp/test-lieferschein.pdf", lsBuffer);

  // 2. Rechnung PDF + freigeben + send simulation
  const r = await prisma.rechnung.findFirstOrThrow({
    where: { status: "Entwurf" },
    include: {
      kunde: true,
      lieferscheine: {
        include: { positionen: { include: { produkt: true } } },
        orderBy: { datum: "asc" },
      },
    },
  });

  const groups = r.lieferscheine.map((l) => ({
    lieferdatum: l.datum,
    positionen: l.positionen.map((p) => ({
      bezeichnung: p.produkt.bezeichnung,
      ean13: p.produkt.ean13,
      packungen: p.packungen,
      einzelpreis: p.preis,
      gesamtpreis: new Decimal(p.preis).mul(p.packungen),
      packungsgroesse: p.produkt.packungsgroesse,
    })),
  }));

  const netto = new Decimal(r.nettoBetrag);
  const mwst7 = netto.mul(0.07).toDecimalPlaces(2);
  const mwst19 = new Decimal(0);
  const brutto = netto.plus(mwst7).plus(mwst19).toDecimalPlaces(2);

  const rBuffer = await renderToBuffer(
    createElement(RechnungDocument, {
      nummer: r.nummer,
      datum: r.datum,
      kunde: r.kunde,
      groups,
      netto,
      mwst7,
      mwst19,
      brutto,
      zusammenfassung: { eier10er: 0, eier6er: 0, eier4er: 0, summeEier: 0 },
      einstellungen: settings,
      logoBase64,
    })
  );
  console.log(`Rechnung PDF: ${rBuffer.length} bytes (${r.nummer})`);
  await fs.writeFile("/tmp/test-rechnung.pdf", rBuffer);

  const url = await storePdf(r.nummer, rBuffer);
  console.log(`Stored at ${url}`);
  await prisma.rechnung.update({
    where: { id: r.id },
    data: { status: "Freigegeben", pdfUrl: url },
  });

  if (r.kunde.email) {
    const transport = nodemailer.createTransport({ host: "localhost", port: 1025 });
    await transport.sendMail({
      from: "Eierhof <lieferschein@eierhof-lafferde.de>",
      to: r.kunde.email,
      subject: `Rechnung ${r.nummer} – Eierhof Groß Lafferde`,
      text: `Im Anhang finden Sie die Rechnung ${r.nummer}.`,
      attachments: [{ filename: `${r.nummer}.pdf`, content: rBuffer, contentType: "application/pdf" }],
    });
    await prisma.rechnung.update({ where: { id: r.id }, data: { status: "Versendet" } });
    console.log(`Sent rechnung email to ${r.kunde.email}`);
  } else {
    console.log("Kunde hat keine E-Mail — überspringe Versand.");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
