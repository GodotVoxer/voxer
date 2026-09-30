import { expect, test, type BrowserContext } from "@playwright/test";
import { SETTINGS_STORAGE_KEY } from "../../features/settings/store";
import { seedDemo } from "../support/demoStorage";

const prepare = (context: BrowserContext) => seedDemo(context, { role: "USER", theme: "dark" });

const openSettings = async (page: import("@playwright/test").Page) => {
  await expect(page.getByRole("button", { name: "Notificaciones" })).toBeVisible();
  await page.locator("header button").first().click();
  await page.getByRole("button", { name: "Configuración" }).click();
  const dialog = page.getByRole("dialog").filter({ hasText: "Sonido de notificaciones" });
  await expect(dialog).toBeVisible();
  return dialog;
};

test.describe("Settings panel", () => {
  test("opens from the sidebar with the default values", async ({ page, context }) => {
    await prepare(context);
    await page.goto("/");
    const dialog = await openSettings(page);

    await expect(
      dialog.getByRole("checkbox", { name: /Sonido al reproducir un video/ }),
    ).toBeChecked();
    await expect(
      dialog.getByRole("checkbox", { name: /Historial de notificaciones/ }),
    ).toBeChecked();
    await expect(
      dialog.getByRole("checkbox", { name: /Abrir imágenes en nueva pestaña/ }),
    ).toBeChecked();
    await expect(dialog.getByRole("checkbox", { name: /Tag clásico/ })).not.toBeChecked();
    await expect(dialog.getByRole("button", { name: "Silencio" })).toBeVisible();
  });

  test("a changed preference survives a reload", async ({ page, context }) => {
    await prepare(context);
    await page.goto("/");
    const dialog = await openSettings(page);
    await dialog.getByRole("checkbox", { name: /Tag clásico/ }).check();
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), SETTINGS_STORAGE_KEY))
      .toContain('"classicTagNavigation":true');

    await page.reload();
    const reopened = await openSettings(page);
    await expect(reopened.getByRole("checkbox", { name: /Tag clásico/ })).toBeChecked();
  });
});
