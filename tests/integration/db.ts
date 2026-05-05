import { PrismaClient, Prisma } from "@prisma/client";

export const prisma = new PrismaClient();
export const Decimal = Prisma.Decimal;

/** Wipe transactional rows but leave Produkt, User, Einstellungen alone. */
export async function resetTransactionalRows() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE
      "LieferscheinPosition",
      "_RechnungLieferscheine",
      "Rechnung",
      "Lieferschein",
      "KundeProduktPreis",
      "Kunde",
      "Counter"
    RESTART IDENTITY CASCADE
  `);
}

export async function ensureFixtures() {
  // Settings singleton
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

  // Test admin & fahrer
  await prisma.user.upsert({
    where: { email: "test-admin@example.com" },
    create: {
      email: "test-admin@example.com",
      password: "test",
      name: "Test Admin",
      role: "ADMIN",
      aktiv: true,
    },
    update: {},
  });
  const fahrer = await prisma.user.upsert({
    where: { email: "test-fahrer@example.com" },
    create: {
      email: "test-fahrer@example.com",
      password: "test",
      name: "Test Fahrer",
      role: "FAHRER",
      aktiv: true,
    },
    update: {},
  });

  // Two products: 10er L (7% MwSt) and Eierlikör (19% MwSt)
  const p10 = await prisma.produkt.upsert({
    where: { ean13: "4260694670002" },
    create: {
      bezeichnung: "Eier Kl. A L br. Freil. (10er)",
      ean13: "4260694670002",
      standardpreis: new Decimal("2.65"),
      mwstSatz: new Decimal("7"),
      einheit: "Packung",
      packungsgroesse: 10,
      packungenProKiste: 21,
      aktiv: true,
    },
    update: {},
  });
  const p6 = await prisma.produkt.upsert({
    where: { ean13: "4260694670019" },
    create: {
      bezeichnung: "Eier Kl. A L br. Freil. (6er)",
      ean13: "4260694670019",
      standardpreis: new Decimal("1.59"),
      mwstSatz: new Decimal("7"),
      einheit: "Packung",
      packungsgroesse: 6,
      packungenProKiste: 30,
      aktiv: true,
    },
    update: {},
  });

  return { fahrer, p10, p6 };
}

export async function makeKunde(opts: {
  gln?: string | null;
  kuerzel: string;
  firmenname?: string;
  email?: string;
}) {
  return prisma.kunde.create({
    data: {
      gln: opts.gln ?? null,
      kuerzel: opts.kuerzel,
      firmenname: opts.firmenname ?? "Test-Kunde",
      adresse: "Teststraße 1",
      plz: "12345",
      ort: "Teststadt",
      email: opts.email ?? null,
      aktiv: true,
    },
  });
}
