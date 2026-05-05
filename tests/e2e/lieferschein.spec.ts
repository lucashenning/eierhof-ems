import {
  test,
  expect,
  login,
  drawSignature,
  E2E_FAHRER_EMAIL,
  E2E_FAHRER_PASSWORD,
  E2E_KUNDE_FIRMA,
} from "./fixtures";

test.describe("Lieferschein creation (driver flow)", () => {
  test("fahrer creates a Lieferschein with a position and a signature", async ({ page }) => {
    await login(page, E2E_FAHRER_EMAIL, E2E_FAHRER_PASSWORD);

    // Empty list state
    await expect(page.getByText("Noch keine Lieferscheine vorhanden.")).toBeVisible();

    await page.getByRole("link", { name: /Neuer Lieferschein/ }).click();
    await expect(page).toHaveURL(/\/lieferscheine\/neu$/);

    // Pick the seeded customer
    await page.getByPlaceholder(/Kunde suchen/).fill("E2E");
    await page.getByText(E2E_KUNDE_FIRMA, { exact: false }).click();
    await expect(page.getByText("GLN 9999999999990")).toBeVisible();

    // Datum & MHD are pre-filled in German format DD.MM.YYYY — verify MHD = Datum + 25
    const datumValue = await page.locator("#datum").inputValue();
    const mhdValue = await page.locator("#mhd").inputValue();
    const parseDe = (s: string) => {
      const [d, m, y] = s.split(".");
      return new Date(`${y}-${m}-${d}T00:00:00Z`);
    };
    const datum = parseDe(datumValue);
    const mhd = parseDe(mhdValue);
    expect(/^\d{2}\.\d{2}\.\d{4}$/.test(datumValue)).toBe(true);
    const diffDays = (mhd.getTime() - datum.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(25);

    // Add one position; explicitly pick the (10er) product so the live-calc
    // assertion below isn't sensitive to alphabetical default in the dropdown
    // (the dev seed has 10 active products).
    await page.getByRole("button", { name: /^Position$/ }).click();
    const positionRow = page.locator(".grid.grid-cols-12").first();
    await positionRow.locator("select").selectOption({ label: "Eier Kl. A L br. Freil. (10er)" });
    // Packungen / Kisten / Stück are all text inputs now (Packungen + Kisten
    // are mutually editable; Stück stays readonly). Type Packungen first.
    const packungenInput = positionRow.locator('input[inputmode="numeric"]').nth(0);
    await packungenInput.fill("21");

    // Live-computed Kisten / Stück: 21 packs / 21 per Kiste = 1; × 10 = 210
    const kistenInput = positionRow.locator('input[inputmode="numeric"]').nth(1);
    const stueckInput = positionRow.locator("input[readonly]");
    await expect(kistenInput).toHaveValue("1");
    await expect(stueckInput).toHaveValue("210");

    // Now flip the canonical input — type 2 in Kisten and verify Packungen
    // back-fills to 2 × 21 = 42 (the dual-input behavior).
    await kistenInput.fill("2");
    await expect(packungenInput).toHaveValue("42");
    await expect(stueckInput).toHaveValue("420");

    // Reset to 21 packs for the rest of the test
    await packungenInput.fill("21");

    await drawSignature(page);
    await expect(page.getByText("Unterschrift erfasst")).toBeVisible();

    await page.getByRole("button", { name: /Lieferschein speichern/ }).click();

    // Lands on detail page with the saved Lieferschein
    await page.waitForURL(/\/lieferscheine\/[a-z0-9-]+$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Lieferschein LS\d+/ })).toBeVisible();
    await expect(page.getByText(E2E_KUNDE_FIRMA)).toBeVisible();
    await expect(page.getByText(/Eier Kl\. A L br\. Freil\. \(10er\)/)).toBeVisible();

    // The list should now have exactly one row
    await page.getByRole("link", { name: "Lieferscheine" }).click();
    await expect(page).toHaveURL(/\/lieferscheine$/);
    await expect(page.getByText("Noch keine Lieferscheine vorhanden.")).not.toBeVisible();
    await expect(page.getByRole("cell", { name: E2E_KUNDE_FIRMA })).toBeVisible();
  });

  test("form blocks submission without a signature", async ({ page }) => {
    await login(page, E2E_FAHRER_EMAIL, E2E_FAHRER_PASSWORD);
    await page.goto("/lieferscheine/neu");

    await page.getByPlaceholder(/Kunde suchen/).fill("E2E");
    await page.getByText(E2E_KUNDE_FIRMA, { exact: false }).click();
    await page.getByRole("button", { name: /^Position$/ }).click();
    const row = page.locator(".grid.grid-cols-12").first();
    await row.locator("select").selectOption({ label: "Eier Kl. A L br. Freil. (10er)" });
    await row.locator('input[inputmode="numeric"]').first().fill("5");

    await page.getByRole("button", { name: /Lieferschein speichern/ }).click();
    await expect(page.getByText("Bitte unterschreiben lassen.")).toBeVisible();
    await expect(page).toHaveURL(/\/lieferscheine\/neu$/);
  });
});
