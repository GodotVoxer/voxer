import { expect, test } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

test.beforeEach(async ({ page }) => {
  await seedDemo(page, { role: "ADMIN" });
});

const openModerationForFirstComment = async (page: import("@playwright/test").Page) => {
  await page.getByRole("button", { name: "Acciones de staff" }).first().click();
  await page.getByRole("menuitem", { name: "Moderar publicación" }).click();
  const dialog = page.getByRole("dialog").filter({ hasText: "Moderar comentario" });
  await expect(dialog).toBeVisible();
  return dialog;
};

test("after moderating one publication the next one opens a clean dialog", async ({ page }) => {
  await page.goto("/vox/1");
  await expect(page.getByRole("button", { name: "Acciones de staff" }).first()).toBeVisible();

  const first = await openModerationForFirstComment(page);
  await first.getByRole("radio", { name: /Eliminar y borrar el archivo/ }).check();
  await first.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(first).toBeHidden();

  const second = await openModerationForFirstComment(page);
  await expect(second.getByText("Listo.")).toHaveCount(0);
  await expect(second.getByRole("radio", { name: /^Eliminar Deja de verse/ })).toBeChecked();
  const confirm = second.getByRole("button", { name: "Eliminar", exact: true });
  await expect(confirm).toBeEnabled();
  await second.getByRole("button", { name: "Cancelar" }).click();
  await expect(second).toBeHidden();
});

test("keeping it published without a ban cannot be confirmed", async ({ page }) => {
  await page.goto("/vox/1");
  await expect(page.getByRole("button", { name: "Acciones de staff" }).first()).toBeVisible();
  const dialog = await openModerationForFirstComment(page);
  await dialog.getByRole("radio", { name: /Dejarla publicada/ }).check();
  await expect(dialog.getByRole("button", { name: "Confirmar" })).toBeDisabled();
});

test("the ban duration fields do not overlap on narrow screens", async ({ page }) => {
  await page.goto("/vox/1");
  await expect(page.getByRole("button", { name: "Acciones de staff" }).first()).toBeVisible();
  const dialog = await openModerationForFirstComment(page);
  await dialog.getByRole("checkbox", { name: /Banear al autor/ }).check();
  await dialog.getByRole("radio", { name: "Las más recientes" }).check();

  const dialogBox = await dialog.boundingBox();
  const pairs = [
    [dialog.getByRole("spinbutton", { name: "Cantidad" }), dialog.getByRole("combobox").first()],
    [
      dialog.getByRole("spinbutton", { name: "Publicado en los últimos" }),
      dialog.getByRole("combobox").nth(1),
    ],
  ] as const;
  for (const [amount, unit] of pairs) {
    await amount.scrollIntoViewIfNeeded();
    const a = await amount.boundingBox();
    const u = await unit.boundingBox();
    expect(a && u && dialogBox).toBeTruthy();
    // Separated by the gap, and neither leaves the dialog.
    expect(u!.x - (a!.x + a!.width)).toBeGreaterThanOrEqual(4);
    expect(u!.x + u!.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width);
  }
});

test("deleting a comment offers purging its media only when it has some, and blocking it to an admin", async ({
  page,
}) => {
  await page.goto("/vox/1");
  const staffMenus = page.getByRole("button", { name: "Acciones de staff" });
  await expect(staffMenus.first()).toBeVisible();

  // Without an attachment: nothing to purge.
  await staffMenus.first().click();
  await page.getByRole("menuitem", { name: "Eliminar comentario" }).click();
  let dialog = page.getByRole("dialog").filter({ hasText: "¿Eliminar este comentario?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("checkbox", { name: /Borrar también el archivo/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();

  // With an attachment.
  await page.getByRole("button", { name: "Adjuntar enlace" }).click();
  const linkDialog = page.getByRole("dialog").filter({ hasText: "Adjuntar enlace" });
  await linkDialog
    .getByPlaceholder(/imagen\) o enlace de YouTube/)
    .fill("https://example.com/prueba.png");
  await linkDialog.getByRole("button", { name: "Aplicar enlace" }).click();
  await page.locator("[data-comment-composer-input]").fill("prueba-purga");
  const posted = page.waitForResponse(
    (r) => /\/api\/vox\/1\/comments$/.test(r.url()) && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Comentar", exact: true }).click();
  const { publicTag } = (await (await posted).json()) as { publicTag: string };

  const row = page.locator(`[id="${publicTag.toUpperCase()}"]`);
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Acciones de staff" }).click();
  await page.getByRole("menuitem", { name: "Eliminar comentario" }).click();
  dialog = page.getByRole("dialog").filter({ hasText: "¿Eliminar este comentario?" });
  const purge = dialog.getByRole("checkbox", { name: /Borrar también el archivo/ });
  const block = dialog.getByRole("checkbox", { name: /Bloquear el archivo/ });
  await expect(purge).toBeVisible();
  await expect(block).toHaveCount(0);
  await purge.check();
  await block.check();
  // Unchecking the purge also drops the block, which implies it.
  await purge.uncheck();
  await expect(block).toHaveCount(0);
  await purge.check();
  await expect(block).not.toBeChecked();
  await block.check();

  const purgeRequest = page.waitForRequest(
    (r) => r.url().includes("/purge-media") && r.method() === "POST",
  );
  await dialog.getByRole("button", { name: "Eliminar", exact: true }).click();
  expect((await purgeRequest).postDataJSON()).toEqual({ block: true });
  await expect(dialog).toBeHidden();
  await expect(row).toHaveCount(0);
});
