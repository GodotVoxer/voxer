import { http, HttpResponse } from "msw";
import { COMMUNITY_RULES_VERSION } from "@/lib/auth/communityRules";
import { demoState, readMockRulesAccepted, mswDemoRole } from "@/mocks/handlers/shared";

export const authHandlers = [
  http.get("/api/auth/me", () => {
    const role = mswDemoRole();
    if (!demoState.authSessionActive || (role === "ANON" && !demoState.anonSignedIn)) {
      return HttpResponse.json({ user: null });
    }
    return HttpResponse.json({
      user: {
        id: "msw-demo",
        username: "demo",
        role: role === "ANON" ? "USER" : role,
        unreadNotifications: 0,
        unreadModerationNotifications: 0,
        theme: demoState.accountTheme,
        rulesAccepted: readMockRulesAccepted(),
      },
    });
  }),
  http.post("/api/auth/login", () => {
    demoState.authSessionActive = true;
    demoState.anonSignedIn = true;
    return HttpResponse.json({ ok: true });
  }),
  http.post("/api/auth/register", async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { acceptRules?: unknown } | null;
    if (body?.acceptRules !== true) {
      return HttpResponse.json(
        { error: "Tenés que aceptar las reglas de Voxer para crear una cuenta." },
        { status: 400 },
      );
    }
    demoState.authSessionActive = true;
    demoState.anonSignedIn = true;
    demoState.rulesAccepted = true;
    return HttpResponse.json({ ok: true }, { status: 201 });
  }),
  http.post("/api/auth/rules", async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { version?: unknown } | null;
    if (body?.version !== COMMUNITY_RULES_VERSION) {
      return HttpResponse.json(
        { error: "Las reglas cambiaron. Recargá la página para leerlas." },
        { status: 409 },
      );
    }
    demoState.rulesAccepted = true;
    return HttpResponse.json({ ok: true });
  }),
  http.post("/api/auth/logout", () => {
    demoState.authSessionActive = false;
    demoState.anonSignedIn = false;
    return HttpResponse.json({ ok: true });
  }),
  /** MSW cannot emulate the realtime Worker; live updates need `cd realtime && npx wrangler dev`. */
  http.get("/api/auth/socket", () => {
    return HttpResponse.json({ token: "msw-no-socket" });
  }),
];
