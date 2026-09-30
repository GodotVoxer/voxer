import { expect, test } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

test("replies popup moderation actions work seamlessly", async ({ page }) => {
  await seedDemo(page, { role: "ADMIN", theme: "dark" });

  await page.goto("/vox/1");
  await expect(page.getByPlaceholder(/./).first()).toBeVisible();

  const repliesBtn = page.getByRole("button", { name: /^Respuestas: \d+$/ }).first();
  await repliesBtn.click();
  const repliesDialog = page.getByRole("dialog").filter({ hasText: "Respuestas a" });
  await expect(repliesDialog).toBeVisible();

  const staffButton = repliesDialog.getByRole("button", { name: "Acciones de staff" }).first();
  await expect(staffButton).toBeVisible();
  await staffButton.click();

  const deleteMenuItem = page.getByRole("menuitem", { name: "Eliminar comentario" });
  await expect(deleteMenuItem).toBeVisible();
  await deleteMenuItem.click();

  const confirmDialog = page.getByRole("dialog").filter({ hasText: "¿Eliminar este comentario?" });
  await expect(confirmDialog).toBeVisible();

  const cancelBtn = confirmDialog.getByRole("button", { name: "Cancelar" });
  await cancelBtn.click();
  await expect(confirmDialog).not.toBeVisible();

  // The replies dialog stays open and the staff button still works
  await expect(repliesDialog).toBeVisible();
  await staffButton.click();
  await expect(deleteMenuItem).toBeVisible();

  await deleteMenuItem.click();
  await expect(confirmDialog).toBeVisible();
  const confirmBtn = confirmDialog.getByRole("button", { name: "Eliminar", exact: true });
  await confirmBtn.click();
  await expect(confirmDialog).not.toBeVisible();
});

test("pinned comment staff moderation works seamlessly", async ({ page }) => {
  await seedDemo(page, { role: "ADMIN", theme: "dark" });

  await page.goto("/vox/1");
  await expect(page.getByPlaceholder(/./).first()).toBeVisible();

  const pinnedComment = page.locator("[data-pinned-copy]");
  await expect(pinnedComment.first()).toBeVisible();

  const staffBtn = pinnedComment.first().getByRole("button", { name: "Acciones de staff" });
  await expect(staffBtn).toBeVisible();
  await staffBtn.click();

  const deleteMenuItem = page.getByRole("menuitem", { name: "Eliminar comentario" });
  await expect(deleteMenuItem).toBeVisible();
  await deleteMenuItem.click();

  const confirmDialog = page.getByRole("dialog").filter({ hasText: "¿Eliminar este comentario?" });
  await expect(confirmDialog).toBeVisible();

  const confirmBtn = confirmDialog.getByRole("button", { name: "Eliminar", exact: true });
  await confirmBtn.click();
  await expect(confirmDialog).not.toBeVisible();
  await expect(pinnedComment).toHaveCount(0);
});

test("comment tag popup moderation actions work seamlessly", async ({ page }) => {
  await seedDemo(page, { role: "ADMIN", theme: "dark" });

  await page.goto("/vox/1");
  await expect(page.getByPlaceholder(/./).first()).toBeVisible();

  const tagLink = page.getByRole("button", { name: /^>>[A-Z0-9]+$/ }).first();
  await tagLink.click();

  const tagDialog = page.getByRole("dialog").filter({ hasText: "Comentario citado" });
  await expect(tagDialog).toBeVisible();

  const staffButton = tagDialog.getByRole("button", { name: "Acciones de staff" });
  await expect(staffButton).toBeVisible();
  await staffButton.click();

  const modPubItem = page.getByRole("menuitem", { name: "Moderar publicación" });
  await expect(modPubItem).toBeVisible();
  await modPubItem.click();

  const modDialog = page.getByRole("dialog").filter({ hasText: "Moderar comentario" });
  await expect(modDialog).toBeVisible();

  const closeBtn = modDialog.getByRole("button", { name: "Cancelar" }).first();
  await closeBtn.click();
  await expect(modDialog).not.toBeVisible();
});
