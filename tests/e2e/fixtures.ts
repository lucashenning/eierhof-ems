import { test as base, expect, type Page } from "@playwright/test";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const Decimal = Prisma.Decimal;

export const E2E_ADMIN_EMAIL = "e2e-admin@example.com";
export const E2E_ADMIN_PASSWORD = "e2e-pass";
export const E2E_FAHRER_EMAIL = "e2e-fahrer@example.com";
export const E2E_FAHRER_PASSWORD = "e2e-pass";
export const E2E_KUNDE_FIRMA = "E2E-Test-Kunde GmbH";

/** Reset transactional rows and (re)create the minimal fixtures every test needs.
 *  Produkt is NOT truncated so the dev seed (10 standard products) survives — tests
 *  that care about a specific product must select it explicitly. */
export async function resetAndSeed() {
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

  await prisma.user.upsert({
    where: { email: E2E_ADMIN_EMAIL },
    create: { email: E2E_ADMIN_EMAIL, password: E2E_ADMIN_PASSWORD, name: "E2E Admin", role: "ADMIN", aktiv: true },
    update: { password: E2E_ADMIN_PASSWORD, role: "ADMIN", aktiv: true },
  });
  await prisma.user.upsert({
    where: { email: E2E_FAHRER_EMAIL },
    create: { email: E2E_FAHRER_EMAIL, password: E2E_FAHRER_PASSWORD, name: "E2E Fahrer", role: "FAHRER", aktiv: true },
    update: { password: E2E_FAHRER_PASSWORD, role: "FAHRER", aktiv: true },
  });

  await prisma.produkt.upsert({
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
  await prisma.produkt.upsert({
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

  await prisma.kunde.create({
    data: {
      gln: "9999999999990",
      kuerzel: "ET",
      firmenname: E2E_KUNDE_FIRMA,
      adresse: "Teststraße 1",
      plz: "12345",
      ort: "Teststadt",
      email: "e2e-kunde@example.com",
      aktiv: true,
    },
  });
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL(/\/(dashboard|lieferscheine)/);
}

/**
 * Simulate a customer signature on the canvas. The signature pad becomes
 * "valid" after any pointer drag — we just need a non-empty canvas to clear
 * the form's required-signature check.
 */
export async function drawSignature(page: Page) {
  const canvas = page.locator("canvas").first();
  await canvas.waitFor({ state: "visible" });
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("signature canvas has no bounding box");
  // Two short strokes — enough to populate the canvas data URL.
  await page.mouse.move(box.x + 30, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 60, { steps: 5 });
  await page.mouse.move(box.x + 130, box.y + 80, { steps: 5 });
  await page.mouse.up();
}

export const test = base.extend<{ seeded: void }>({
  seeded: [
    async ({}, use) => {
      await resetAndSeed();
      await use();
    },
    { auto: true },
  ],
});

export { expect };
