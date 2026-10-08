import { expect, test } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

test("the new vox fields opt out of autofill, so Android does not offer passwords", async ({
  page,
  context,
}) => {
  await seedDemo(context, { role: "USER", nsfwPromptAnswered: true });
  await page.goto("/");
  await page.getByRole("button", { name: "Crear vox" }).click();
  const dialog = page.getByRole("dialog").filter({ hasText: "Nuevo vox" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Pegar enlace" }).click();
  await dialog.getByRole("checkbox", { name: "Encuesta" }).check();
  const fields = dialog.locator("input:not([type]), input[type=text], textarea");
  await expect(fields).not.toHaveCount(0);
  for (const field of await fields.all()) {
    await expect(field).toHaveAttribute("autocomplete", "off");
    await expect(field).toHaveAttribute("name", /^vox-/);
  }
});
