import { expect, test } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

test.beforeEach(async ({ context }) => {
  await seedDemo(context, { role: "ADMIN", nsfwPromptAnswered: false });
});

test("full previews without overflow and without comment actions", async ({ page }) => {
  await page.goto("/moderacion");
  await expect(page.getByRole("heading", { name: "Panel de moderación" })).toBeVisible();
  await expect(page.getByPlaceholder("ID del usuario (cuid)")).toHaveCount(0);
  await page.getByRole("button", { name: "96QT70IF", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Comentario eliminado" })).toBeVisible();
  await expect(dialog.getByText("Anónimo", { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /Ocultar contenido|Denunciar|Compartir|Responder/ }),
  ).toHaveCount(0);
  await expect.poll(() => dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Un título de vox muy largo/ }).click();
  await expect(
    dialog.getByRole("heading", { name: "Vox recategorizado: General → Política" }),
  ).toBeVisible();
  await expect(dialog.getByRole("heading", { name: /Un título de vox muy largo/ })).toBeVisible();
  await expect.poll(() => dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await expect(dialog.locator("img, video, iframe")).toHaveCount(0);
  await expect(dialog.getByText("Sin multimedia", { exact: true })).toHaveCount(0);
});

test("a bulk delete paginates comments and vox", async ({ page }) => {
  await page.goto("/moderacion");
  await page.getByRole("button", { name: /vox: 1, comentarios: 11/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("article")).toHaveCount(10);
  await dialog.getByRole("button", { name: "Siguiente" }).click();
  await expect(dialog.locator("article")).toHaveCount(2);
  await expect(dialog.getByText(/Publicaciones 11–12 de 12/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  await expect.poll(() => dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
});
