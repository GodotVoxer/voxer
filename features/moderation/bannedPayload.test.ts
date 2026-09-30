import { describe, expect, it, vi, afterEach } from "vitest";
import axios from "axios";
import {
  formatBanRemainingEs,
  parseBannedFromAxios,
  parseClientNetworkBlockedFromAxios,
} from "@/features/moderation/bannedPayload";

afterEach(() => {
  vi.restoreAllMocks();
});

const ban = {
  id: "b1",
  reason: "spam",
  createdAt: "2026-09-01T00:00:00.000Z",
  endsAt: "2026-09-04T00:00:00.000Z",
};

describe("parseClientNetworkBlockedFromAxios", () => {
  it("detects a CLIENT_NETWORK_BLOCKED body with the ban's reason and end", () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
    const r = parseClientNetworkBlockedFromAxios({
      response: {
        data: {
          code: "CLIENT_NETWORK_BLOCKED",
          error: "Publicar desde esta conexión no está permitido.",
          ban: { ...ban, scope: "network" },
        },
      },
    });
    expect(r?.code).toBe("CLIENT_NETWORK_BLOCKED");
    expect(r?.error).toContain("conexión");
    expect(r?.ban).toEqual({ ...ban, scope: "network" });
  });

  it("keeps the message when the body has no ban (older server)", () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
    const r = parseClientNetworkBlockedFromAxios({
      response: { data: { code: "CLIENT_NETWORK_BLOCKED", error: "x" } },
    });
    expect(r?.ban).toBe(null);
    expect(r?.error).toBe("x");
  });

  it("returns null for non-Axios errors", () => {
    expect(parseClientNetworkBlockedFromAxios(new Error("x"))).toBe(null);
  });

  it("returns null when the code does not match", () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
    expect(
      parseClientNetworkBlockedFromAxios({
        response: { data: { code: "BANNED", ban: {} } },
      }),
    ).toBe(null);
  });
});

describe("parseBannedFromAxios", () => {
  it("a ban without scope is an account ban", () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
    const r = parseBannedFromAxios({ response: { data: { code: "BANNED", ban } } });
    expect(r?.ban.scope).toBe("account");
    expect(r?.ban.reason).toBe("spam");
  });

  it("permanent ban", () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
    const r = parseBannedFromAxios({
      response: { data: { code: "BANNED", ban: { ...ban, endsAt: null } } },
    });
    expect(r?.ban.endsAt).toBe(null);
  });
});

describe("formatBanRemainingEs", () => {
  const now = new Date("2026-09-01T00:00:00.000Z");
  it("days and hours", () => {
    expect(formatBanRemainingEs("2026-09-03T03:20:00.000Z", now)).toBe("2 días y 3 horas");
  });
  it("singular", () => {
    expect(formatBanRemainingEs("2026-09-02T01:00:00.000Z", now)).toBe("1 día y 1 hora");
  });
  it("hours and minutes", () => {
    expect(formatBanRemainingEs("2026-09-01T02:05:00.000Z", now)).toBe("2 horas y 5 minutos");
  });
  it("rounds leftover seconds up", () => {
    expect(formatBanRemainingEs("2026-09-01T00:00:10.000Z", now)).toBe("1 minuto");
  });
  it("already expired", () => {
    expect(formatBanRemainingEs("2026-08-31T00:00:00.000Z", now)).toBe(null);
  });
});
