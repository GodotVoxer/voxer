import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

const prepare = async (
  context: BrowserContext,
  { role, rulesAccepted }: { role: "USER" | "ANON"; rulesAccepted: boolean },
) => {
  await seedDemo(context, { role, rulesAccepted });
};

const rulesDialog = (page: Page) =>
  page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Reglas de Voxer" }) });

const expectRulesListed = async (page: Page) => {
  const dialog = rulesDialog(page);
  await expect(dialog).toBeVisible();
  for (const rule of [
    "Respetá las categorías",
    "Nada de spam ni flood",
    "Respetá la ley argentina",
    "No se permite el gore",
  ]) {
    await expect(dialog.getByText(rule)).toBeVisible();
  }
  await expect(dialog.getByText("¡Disfrutá de Voxer!")).toBeVisible();
};

const openAuth = async (page: Page, mode: "Ingresar" | "Registro") => {
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  const auth = page.getByRole("dialog");
  await expect(auth).toBeVisible();
  await auth.getByRole("button", { name: mode, exact: true }).click();
  await auth.getByLabel(/^Usuario/).fill("nuevo_usuario");
  await auth.getByLabel(/^Contraseña/).fill("una-contraseña-larga");
  if (mode === "Registro") await auth.getByLabel("Repetir contraseña").fill("una-contraseña-larga");
  return auth;
};

const signedIn = (page: Page) => page.getByRole("button", { name: "Notificaciones" });
const signedOut = (page: Page) => page.getByRole("button", { name: "Entrar", exact: true });

test.describe("Voxer rules", () => {
  test("sign-up requires accepting them before the account is created", async ({
    page,
    context,
  }) => {
    await prepare(context, { role: "ANON", rulesAccepted: false });
    await page.goto("/");
    const auth = await openAuth(page, "Registro");

    let registerCalls = 0;
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().endsWith("/api/auth/register")) registerCalls += 1;
    });

    await auth.getByRole("button", { name: "Registrarme" }).click();
    await expectRulesListed(page);
    await expect(rulesDialog(page).getByText("Si cancelás, no se crea la cuenta.")).toBeVisible();

    // Neither Escape nor an outside click closes it: a choice is required.
    await page.keyboard.press("Escape");
    await expect(rulesDialog(page)).toBeVisible();

    await rulesDialog(page).getByRole("button", { name: "Cancelar" }).click();
    await expect(rulesDialog(page)).toBeHidden();
    await expect(auth.getByRole("button", { name: "Registrarme" })).toBeVisible();
    expect(registerCalls).toBe(0);

    await auth.getByRole("button", { name: "Registrarme" }).click();
    const registerRequest = page.waitForRequest(
      (req) => req.method() === "POST" && req.url().endsWith("/api/auth/register"),
    );
    await rulesDialog(page).getByRole("button", { name: "Aceptar" }).click();
    expect((await registerRequest).postDataJSON()).toMatchObject({ acceptRules: true });

    await expect(signedIn(page)).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("an account that never accepted sees them when signing in", async ({ page, context }) => {
    await prepare(context, { role: "ANON", rulesAccepted: false });
    await page.goto("/");

    await (await openAuth(page, "Ingresar")).getByRole("button", { name: "Entrar" }).click();
    await expectRulesListed(page);
    await expect(rulesDialog(page).getByText("Si cancelás, se cierra la sesión.")).toBeVisible();
    await rulesDialog(page).getByRole("button", { name: "Cancelar" }).click();
    await expect(signedOut(page)).toBeVisible();

    await (await openAuth(page, "Ingresar")).getByRole("button", { name: "Entrar" }).click();
    const acceptRequest = page.waitForRequest(
      (req) => req.method() === "POST" && req.url().endsWith("/api/auth/rules"),
    );
    await rulesDialog(page).getByRole("button", { name: "Aceptar" }).click();
    await acceptRequest;
    await expect(rulesDialog(page)).toBeHidden();
    await expect(signedIn(page)).toBeVisible();
  });

  test("an account that accepted signs in without seeing them", async ({ page, context }) => {
    await prepare(context, { role: "ANON", rulesAccepted: true });
    await page.goto("/");
    await (await openAuth(page, "Ingresar")).getByRole("button", { name: "Entrar" }).click();
    await expect(signedIn(page)).toBeVisible();
    await expect(rulesDialog(page)).toHaveCount(0);
  });

  test("with a session they are requested on commenting and nothing is posted without accepting", async ({
    page,
    context,
  }) => {
    await prepare(context, { role: "USER", rulesAccepted: false });
    await page.goto("/vox/1");
    const textarea = page.getByPlaceholder(/Escribí un comentario/);
    await expect(textarea).toBeVisible();
    // Opening the page with a session is not enough: they are requested only on publishing.
    await expect(rulesDialog(page)).toHaveCount(0);

    const body = "comentario después de leer las reglas";
    await textarea.fill(body);
    await page.getByRole("button", { name: "Comentar", exact: true }).click();
    await expectRulesListed(page);
    await rulesDialog(page).getByRole("button", { name: "Cancelar" }).click();
    await expect(
      page.getByText("Tenés que aceptar las reglas de Voxer para publicar."),
    ).toBeVisible();
    await expect(textarea).toHaveValue(body);

    await page.getByRole("button", { name: "Comentar", exact: true }).click();
    await rulesDialog(page).getByRole("button", { name: "Aceptar" }).click();
    await expect(textarea).toHaveValue("");
    await expect(page.getByText(body)).toBeVisible();

    await textarea.fill("otro comentario");
    await page.getByRole("button", { name: "Comentar", exact: true }).click();
    await expect(textarea).toHaveValue("");
    await expect(rulesDialog(page)).toHaveCount(0);
  });

  test("with a session they are requested on creating a vox", async ({ page, context }) => {
    await prepare(context, { role: "USER", rulesAccepted: false });
    await page.goto("/");
    await page.getByRole("button", { name: "Crear vox" }).click();
    const form = page.getByRole("dialog").filter({ hasText: "Nuevo vox" });
    await form.getByLabel("Título").fill("Vox de prueba");
    await form.getByLabel("Descripción").fill("Descripción del vox de prueba");
    await form.getByRole("button", { name: "Pegar enlace" }).click();
    await form.getByPlaceholder("https://…").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await form.getByRole("button", { name: "Publicar" }).click();

    await expectRulesListed(page);
    await rulesDialog(page).getByRole("button", { name: "Aceptar" }).click();
    await expect(page).toHaveURL(/\/vox\/(?!1$)[^/]+$/);
  });
});
