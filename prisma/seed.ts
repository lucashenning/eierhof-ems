import { PrismaClient, Prisma } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();
const Decimal = Prisma.Decimal;

type ProductSeed = {
  bezeichnung: string;
  ean13: string;
  standardpreis: string;
  mwstSatz: string;
  packungsgroesse: number;
  packungenProKiste: number;
};

const PRODUCTS: ProductSeed[] = [
  { bezeichnung: "Eier Kl. A L br. Freil. (10er)", ean13: "4260694670002", standardpreis: "2.65", mwstSatz: "7", packungsgroesse: 10, packungenProKiste: 21 },
  { bezeichnung: "Eier Kl. A L br. Freil. (6er)",  ean13: "4260694670019", standardpreis: "1.59", mwstSatz: "7", packungsgroesse: 6,  packungenProKiste: 30 },
  { bezeichnung: "Eier Kl. A M br. Freil. (10er)", ean13: "4260694670026", standardpreis: "2.45", mwstSatz: "7", packungsgroesse: 10, packungenProKiste: 21 },
  { bezeichnung: "Eier Kl. A M br. Freil. (6er)",  ean13: "4260694670033", standardpreis: "1.47", mwstSatz: "7", packungsgroesse: 6,  packungenProKiste: 30 },
  { bezeichnung: "Eier Kl. A XL br. Freil. (4er)", ean13: "4260694670057", standardpreis: "1.32", mwstSatz: "7", packungsgroesse: 4,  packungenProKiste: 21 },
  { bezeichnung: "Eier Kl. A 20er Box",            ean13: "4260694670040", standardpreis: "5.20", mwstSatz: "7", packungsgroesse: 20, packungenProKiste: 12 },
  { bezeichnung: "Eierlikör 0,7 L",                ean13: "4260694670064", standardpreis: "14.95", mwstSatz: "19", packungsgroesse: 1, packungenProKiste: 6 },
  { bezeichnung: "Eierlikör 0,35 L",               ean13: "4260694670071", standardpreis: "8.95",  mwstSatz: "19", packungsgroesse: 1, packungenProKiste: 12 },
  { bezeichnung: "Kaffeelikör 0,7 L",              ean13: "4260694670095", standardpreis: "14.95", mwstSatz: "19", packungsgroesse: 1, packungenProKiste: 6 },
  { bezeichnung: "Kaffeelikör 0,35 L",             ean13: "4260694670088", standardpreis: "8.95",  mwstSatz: "19", packungsgroesse: 1, packungenProKiste: 12 },
];

async function ensureSettings() {
  await prisma.einstellungen.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      firmenname: "Eierhof Groß Lafferde GbR",
      adresse: "Südstraße 28",
      plz: "31246",
      ort: "Ilsede",
      telefon: "05174/367",
      email: "info@eierhof-lafferde.de",
      tagline: "Frische Eier von Lüddeke´s Hof",
      steuernr: "38/231/25208",
      bankname: "Volksbank BraWo",
      iban: "DE40 2699 1066 7371 2920 02",
      bic: "GENODEF1WOB",
      defaultBemerkung: "Freilandeier Güteklasse A",
    },
    update: {},
  });
}

async function ensureAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@eierhof-lafferde.de").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "admin";
  await prisma.user.upsert({
    where: { email },
    create: { email, password, name: "Administrator", role: "ADMIN", aktiv: true },
    update: {},
  });
  // and a Fahrer for testing
  await prisma.user.upsert({
    where: { email: "fahrer@eierhof-lafferde.de" },
    create: {
      email: "fahrer@eierhof-lafferde.de",
      password: "fahrer",
      name: "Test-Fahrer",
      role: "FAHRER",
      aktiv: true,
    },
    update: {},
  });
}

async function ensureProducts() {
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const existing = await prisma.produkt.findUnique({ where: { ean13: p.ean13 } });
    if (!existing) {
      await prisma.produkt.create({
        data: {
          bezeichnung: p.bezeichnung,
          ean13: p.ean13,
          standardpreis: new Decimal(p.standardpreis),
          mwstSatz: new Decimal(p.mwstSatz),
          einheit: "Packung",
          packungsgroesse: p.packungsgroesse,
          packungenProKiste: p.packungenProKiste,
          reihenfolge: i,
          aktiv: true,
        },
      });
      continue;
    }
    // Only backfill reihenfolge when it's still the default 0 — preserve any
    // ordering the admin may have customised in the UI.
    if (existing.reihenfolge === 0) {
      await prisma.produkt.update({
        where: { ean13: p.ean13 },
        data: { reihenfolge: i },
      });
    }
  }
}

type ParsedKunde = {
  kuerzel: string;
  firmenname: string;
  ansprechpartner: string | null;
  adresse: string;
  plz: string;
  ort: string;
  gln: string | null;
  filialnummer: string | null;
  email: string | null;
  preise: Map<string, Prisma.Decimal>; // ean13 -> einzelpreis
};

const SENDER_PREFIX = "Eierhof Groß Lafferde GbR * Südstr. 28 * 31246 Ilsede";

function germanToDecimal(s: string): Prisma.Decimal | null {
  const t = s.trim().replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return new Decimal(t);
}

// Right-column markers — when found inside a line, everything from that point on
// is the company column and gets stripped off the customer line.
const RIGHT_COL_MARKERS: RegExp[] = [
  /info@eierhof-lafferde\.de/,
  /Volksbank BraWo/,
  /IBAN DE/,
  /Bic\s+GENODEF1WOB/,
  /Steuernr\./,
  /05174\/367/,
  /Eierhof Groß Lafferde GbR/,
  /Südstraße 28/,
  /31246 Ilsede(\/Gr\. Lafferde)?/,
];

function stripRightColumn(line: string): string {
  let cut = line.length;
  for (const re of RIGHT_COL_MARKERS) {
    const m = re.exec(line);
    if (m && m.index < cut) cut = m.index;
  }
  return line.slice(0, cut).trimEnd();
}

async function parseRechnungPdf(filePath: string): Promise<ParsedKunde | null> {
  const pdfParse: typeof import("pdf-parse") = (await import("pdf-parse/lib/pdf-parse.js"))
    .default as unknown as typeof import("pdf-parse");
  const buf = await fs.readFile(filePath);
  const result = await pdfParse(buf);
  const text = result.text;

  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const nummerMatch = text.match(/Rechnung\s*Nr\.\s*(E[A-Z]{1,3})(\d{6})/);
  if (!nummerMatch) return null;
  const prefix = nummerMatch[1];
  const kuerzel = prefix.slice(-2).toUpperCase();

  const senderIdx = rawLines.findIndex((l) => l.includes("* Südstr. 28 *"));
  const rechnungIdx = rawLines.findIndex((l) => l.startsWith("Rechnung Nr."));
  if (senderIdx < 0 || rechnungIdx < 0) return null;

  // Take the lines between the sender separator and "Rechnung Nr.",
  // strip the right column off each, drop blanks and pure right-column lines.
  const blacklist = [
    /^Eierhof Groß Lafferde GbR$/,
    /^Südstraße 28$/,
    /^31246 Ilsede(\/Gr\. Lafferde)?$/,
    /^05174\/367$/,
    /^info@eierhof-lafferde\.de$/,
    /^Volksbank BraWo$/,
    /^Bic /,
    /^IBAN /,
    /^Steuernr\./,
  ];
  const customerLines = rawLines
    .slice(senderIdx + 1, rechnungIdx)
    .map(stripRightColumn)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !blacklist.some((b) => b.test(l)));

  if (customerLines.length < 2) return null;

  // Try to identify GLN/Filial line
  let gln: string | null = null;
  let filialnummer: string | null = null;
  const filGlnIdx = customerLines.findIndex((l) => /Fil\.|GLN/.test(l));
  if (filGlnIdx >= 0) {
    const fl = customerLines[filGlnIdx];
    const filMatch = fl.match(/Fil\.?:?\s*Nr\.?:?\s*(\d+)/);
    if (filMatch) filialnummer = filMatch[1];
    const glnMatch = fl.match(/GLN[: ]+(\d+)/);
    if (glnMatch) gln = glnMatch[1];
    customerLines.splice(filGlnIdx, 1);
  }

  // PLZ + Ort line: "38542 Leiferde"
  const plzIdx = customerLines.findIndex((l) => /^\d{5}\s+/.test(l));
  if (plzIdx < 0) return null;
  const [plz, ...ortParts] = customerLines[plzIdx].split(/\s+/);
  const ort = ortParts.join(" ");

  const before = customerLines.slice(0, plzIdx);
  const firmenname = before[0] ?? "Unbekannt";
  let ansprechpartner: string | null = null;
  let adresse = "";
  if (before.length >= 3) {
    ansprechpartner = before[1];
    adresse = before.slice(2).join(", ");
  } else if (before.length === 2) {
    adresse = before[1];
  }

  // Line items: PDF text wraps each EAN onto its own line and the einzelpreis+gesamtpreis
  // get glued together on the next line ("2,65333,90"). Walk lines: on an EAN match,
  // pull leading "\d{1,3},\d{2}" off the next line as einzelpreis.
  const preise = new Map<string, Prisma.Decimal>();
  for (let i = 0; i < rawLines.length - 1; i++) {
    const eanMatch = rawLines[i].match(/^(\d{13})$/);
    if (!eanMatch) continue;
    const next = rawLines[i + 1];
    const priceMatch = next.match(/^(\d{1,3},\d{2})/);
    if (!priceMatch) continue;
    const einzel = germanToDecimal(priceMatch[1]);
    if (!einzel) continue;
    if (!preise.has(eanMatch[1])) preise.set(eanMatch[1], einzel);
  }

  return {
    kuerzel,
    firmenname,
    ansprechpartner,
    adresse,
    plz,
    ort,
    gln,
    filialnummer,
    email: null,
    preise,
  };
}

async function ensureKundenFromPdfs() {
  const dir = path.join(process.cwd(), "styles", "samples", "rechnungen");
  let files: string[] = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".pdf"));
  } catch {
    console.warn(`[seed] PDF directory missing, skipping customer parse: ${dir}`);
    return;
  }
  files.sort();

  const products = await prisma.produkt.findMany();
  const productByEan = new Map(products.map((p) => [p.ean13, p]));

  let created = 0;
  let skipped = 0;
  for (const f of files) {
    try {
      const parsed = await parseRechnungPdf(path.join(dir, f));
      if (!parsed) {
        console.warn(`[seed] could not parse ${f}`);
        skipped++;
        continue;
      }
      // Idempotency key: GLN if present, else (firmenname + plz + ort) since
      // some legacy customers don't have a GLN on file.
      const existing = parsed.gln
        ? await prisma.kunde.findUnique({ where: { gln: parsed.gln } })
        : await prisma.kunde.findFirst({
            where: { firmenname: parsed.firmenname, plz: parsed.plz, ort: parsed.ort, gln: null },
          });
      if (existing) {
        skipped++;
        continue;
      }
      const kunde = await prisma.kunde.create({
        data: {
          gln: parsed.gln,
          kuerzel: parsed.kuerzel,
          firmenname: parsed.firmenname,
          ansprechpartner: parsed.ansprechpartner,
          adresse: parsed.adresse,
          plz: parsed.plz,
          ort: parsed.ort,
          filialnummer: parsed.filialnummer,
          email: parsed.email,
          aktiv: true,
        },
      });

      for (const [ean, sonder] of parsed.preise) {
        const produkt = productByEan.get(ean);
        if (!produkt) continue;
        if (new Decimal(produkt.standardpreis).equals(sonder)) continue;
        await prisma.kundeProduktPreis.upsert({
          where: { kundeId_produktId: { kundeId: kunde.id, produktId: produkt.id } },
          create: { kundeId: kunde.id, produktId: produkt.id, sonderpreis: sonder },
          update: { sonderpreis: sonder },
        });
      }
      created++;
    } catch (e) {
      console.error(`[seed] error on ${f}:`, e);
      skipped++;
    }
  }
  console.log(`[seed] customers: created ${created}, skipped ${skipped}`);
}

async function main() {
  await ensureSettings();
  await ensureAdmin();
  await ensureProducts();
  await ensureKundenFromPdfs();
  console.log("[seed] done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
