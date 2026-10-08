import { beforeEach, expect, it, vi } from "vitest";
import { registerUser } from "./register";

const mocks = vi.hoisted(() => ({ ipBan: vi.fn(), count: vi.fn(), create: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({
  prisma: { user: { count: mocks.count, findFirst: vi.fn(), create: mocks.create } },
}));
vi.mock("@/server/http/clientIpHash", () => ({ hashClientIpFromRawHeaderValue: () => "ip-hash" }));
vi.mock("@/server/moderation/activeClientIpBan", () => ({
  getActiveClientIpBanForHash: mocks.ipBan,
}));
vi.mock("@/server/auth/password", () => ({ hashPassword: async () => "hash" }));

beforeEach(() => {
  vi.clearAllMocks();
});

it("refuses new accounts from a banned network before touching the user table", async () => {
  mocks.ipBan.mockResolvedValue({ id: "ban" });
  const r = await registerUser({ username: "nuevo", password: "x", registrationIp: "1.2.3.4" });
  expect(r).toEqual({
    ok: false,
    message: "No se pueden crear cuentas desde esta conexión.",
    status: 403,
  });
  expect(mocks.ipBan).toHaveBeenCalledWith("ip-hash");
  expect(mocks.count).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});

it("registers normally from a network without an active ban", async () => {
  mocks.ipBan.mockResolvedValue(null);
  mocks.count.mockResolvedValue(0);
  mocks.create.mockResolvedValue({ id: "u1" });
  expect(
    await registerUser({ username: "nuevo", password: "x", registrationIp: "1.2.3.4" }),
  ).toEqual({ ok: true, userId: "u1" });
});
