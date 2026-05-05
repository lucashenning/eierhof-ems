import {
  test,
  expect,
  login,
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_FAHRER_EMAIL,
  E2E_FAHRER_PASSWORD,
} from "./fixtures";

test.describe("Auth & role guards", () => {
  test("anonymous visitor is redirected from / to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
  });

  test("login with bad credentials shows the expected error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Passwort").fill("totally-wrong");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page.getByText("E-Mail oder Passwort falsch")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("admin lands on /dashboard and sees the full nav", async ({ page }) => {
    await login(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard$/);
    for (const label of ["Dashboard", "Lieferscheine", "Rechnungen", "Kunden", "Produkte", "Benutzer", "Einstellungen"]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("fahrer lands on /lieferscheine and sees ONLY the Lieferscheine nav link", async ({ page }) => {
    await login(page, E2E_FAHRER_EMAIL, E2E_FAHRER_PASSWORD);
    await expect(page).toHaveURL(/\/lieferscheine$/);
    await expect(page.getByRole("link", { name: "Lieferscheine" })).toBeVisible();
    for (const label of ["Dashboard", "Rechnungen", "Kunden", "Produkte", "Benutzer", "Einstellungen"]) {
      await expect(page.getByRole("link", { name: label })).toHaveCount(0);
    }
  });

  test("fahrer hitting /dashboard directly is redirected away (server-side guard)", async ({ page }) => {
    await login(page, E2E_FAHRER_EMAIL, E2E_FAHRER_PASSWORD);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/lieferscheine$/);
  });

  test("fahrer hitting /kunden directly is redirected away", async ({ page }) => {
    await login(page, E2E_FAHRER_EMAIL, E2E_FAHRER_PASSWORD);
    await page.goto("/kunden");
    await expect(page).toHaveURL(/\/lieferscheine$/);
  });
});
