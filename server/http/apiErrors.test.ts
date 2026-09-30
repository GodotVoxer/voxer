import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authUnavailableMessageEs,
  dbUnavailableMessageEs,
  internalErrorMessageEs,
  isDbConfigured,
  readJsonBody,
} from "./apiErrors";

describe("service error messages", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("isDbConfigured follows DATABASE_URL", () => {
    vi.stubEnv("DATABASE_URL", "");
    expect(isDbConfigured()).toBe(false);
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/x");
    expect(isDbConfigured()).toBe(true);
  });

  it("hides variable names in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(dbUnavailableMessageEs()).toBe("Servicio no disponible. Probá más tarde.");
    expect(authUnavailableMessageEs()).toBe("Servicio no disponible. Probá más tarde.");
    expect(internalErrorMessageEs()).toBe("Error interno del servidor.");
  });

  it("names the missing configuration in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(dbUnavailableMessageEs()).toMatch(/DATABASE_URL/);
    expect(authUnavailableMessageEs()).toMatch(/AUTH_SECRET/);
  });
});

describe("readJsonBody", () => {
  const post = (body: string) => new Request("http://localhost/api", { method: "POST", body });

  it("returns the parsed body", async () => {
    expect(await readJsonBody(post('{"a":1}'))).toEqual({ body: { a: 1 } });
  });

  it("answers 400 for malformed JSON", async () => {
    const result = await readJsonBody(post("{"));
    expect("error" in result && result.error.status).toBe(400);
  });
});
