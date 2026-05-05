import { PrismaClient, Prisma } from "@prisma/client";
import {
  test,
  expect,
  login,
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_KUNDE_FIRMA,
} from "./fixtures";

const prisma = new PrismaClient();
const Decimal = Prisma.Decimal;

/** Insert a Lieferschein directly via Prisma so we can focus the test on the
 *  Rechnung flow rather than re-walking the driver UI. */
async function seedLieferschein() {
  const kunde = await prisma.kunde.findFirstOrThrow({ where: { firmenname: E2E_KUNDE_FIRMA } });
  const fahrer = await prisma.user.findFirstOrThrow({ where: { role: "FAHRER" } });
  const p10 = await prisma.produkt.findUniqueOrThrow({ where: { ean13: "4260694670002" } });
  const datum = new Date();
  datum.setUTCHours(0, 0, 0, 0);
  const mhd = new Date(datum);
  mhd.setUTCDate(mhd.getUTCDate() + 25);
  return prisma.lieferschein.create({
    data: {
      nummer: "LS26E2E01",
      kundeId: kunde.id,
      fahrerId: fahrer.id,
      datum,
      mhd,
      status: "Unterschrieben",
      unterschrift:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=",
      positionen: {
        create: [{ produktId: p10.id, packungen: 42, preis: new Decimal("2.65"), reihenfolge: 0 }],
      },
    },
  });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe("Rechnung generation + freigabe (admin flow)", () => {
  test("admin generates a Rechnung covering today's Lieferschein and freigibt it", async ({ page }) => {
    await seedLieferschein();
    await login(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);

    await page.getByRole("link", { name: "Rechnungen" }).click();
    await expect(page).toHaveURL(/\/rechnungen$/);
    await page.getByRole("link", { name: /Neue Rechnung/ }).click();
    await expect(page).toHaveURL(/\/rechnungen\/neu$/);

    // Override the default (previous month) range to include today.
    // DateInput is a text input in DD.MM.YYYY format.
    const today = new Date();
    const dd = String(today.getUTCDate()).padStart(2, "0");
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = String(today.getUTCFullYear());
    const de = `${dd}${mm}${yyyy}`; // DateInput auto-inserts dots from digits
    await page.locator("#von").fill("");
    await page.locator("#von").pressSequentially(de);
    await page.locator("#bis").fill("");
    await page.locator("#bis").pressSequentially(de);
    // tab away to commit the value
    await page.locator("#bis").blur();

    // Pick our seeded customer by exact rendered label "<firma> (GLN <gln>)"
    await page.locator("#kundeId").selectOption({ label: `${E2E_KUNDE_FIRMA} (GLN 9999999999990)` });
    await page.getByRole("button", { name: "Rechnung erstellen" }).click();

    await page.waitForURL(/\/rechnungen\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { name: /Rechnung ET\d{6}/ })).toBeVisible();
    // 42 × 2,65 = 111,30 netto · MwSt 7% = 7,79 → brutto 119,09
    await expect(page.getByText("111,30 €")).toBeVisible();
    await expect(page.getByText("119,09 €")).toBeVisible();

    // Status: Entwurf → Freigegeben (target the badge specifically — the
    // status-log card also renders these labels)
    const statusBadge = page.locator(".rounded-full").filter({ hasText: /^(Entwurf|Freigegeben|Versendet)$/ }).first();
    await expect(statusBadge).toHaveText("Entwurf");
    await page.getByRole("button", { name: /Freigeben/ }).click();
    await expect(statusBadge).toHaveText("Freigegeben", { timeout: 30_000 });

    // PDF route serves a real PDF (header bytes start with "%PDF-")
    const url = page.url();
    const id = url.split("/").pop()!;
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const res = await page.request.get(`/pdf/rechnung/${id}`, {
      headers: { cookie: cookieHeader },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
    const body = await res.body();
    expect(body.subarray(0, 5).toString()).toBe("%PDF-");
    expect(body.length).toBeGreaterThan(50_000);

    // The archived row has a pdfUrl set and points at our local tmp/ store
    const stored = await prisma.rechnung.findUniqueOrThrow({ where: { id } });
    expect(stored.status).toBe("Freigegeben");
    expect(stored.pdfUrl).toMatch(/^file:\/\/.*\/tmp\/rechnungen\/ET\d{6}\.pdf$/);
  });

  test("dashboard reflects the day's Umsatz after a Lieferschein is created", async ({ page }) => {
    await seedLieferschein();
    await login(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("111,30 €").first()).toBeVisible();
    await expect(page.getByRole("cell", { name: E2E_KUNDE_FIRMA })).toBeVisible();
  });
});
