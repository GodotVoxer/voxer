import { expect, test } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

test("without a session the create button opens sign in instead of the form", async ({
  page,
  context,
}) => {
  await seedDemo(context, { role: "ANON" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Crear vox" }).click();
  await expect(page.getByRole("dialog", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Nuevo vox" })).toHaveCount(0);
});
