import { describe, expect, it, vi, beforeEach } from "vitest";

import { prisma } from "@/server/db/prisma";
import {
  addStaffMemberByUsername,
  adminMayAssignRoleToTarget,
  setUserRoleByAdmin,
} from "./staffDirectory";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("adminMayAssignRoleToTarget", () => {
  it("allows changing the role of non-admins", () => {
    expect(adminMayAssignRoleToTarget("MOD", "USER")).toBe(true);
    expect(adminMayAssignRoleToTarget("USER", "MOD")).toBe(true);
  });
  it("allows promoting a MOD to ADMIN", () => {
    expect(adminMayAssignRoleToTarget("MOD", "ADMIN")).toBe(true);
  });
  it("does not allow demoting another ADMIN", () => {
    expect(adminMayAssignRoleToTarget("ADMIN", "MOD")).toBe(false);
    expect(adminMayAssignRoleToTarget("ADMIN", "USER")).toBe(false);
  });
  it("allows a no-op that keeps another admin as ADMIN", () => {
    expect(adminMayAssignRoleToTarget("ADMIN", "ADMIN")).toBe(true);
  });
});

describe("setUserRoleByAdmin", () => {
  it("refuses to change one's own role before touching the database", async () => {
    const r = await setUserRoleByAdmin("same-id", "same-id", "USER");
    expect(r).toEqual({ ok: false, kind: "cannot_change_own_role" });
  });
});

describe("addStaffMemberByUsername", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.findFirst).mockReset();
    vi.mocked(prisma.user.update).mockReset();
  });

  it("returns forbidden when the actor is not an admin", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ role: "MOD" } as never);
    const r = await addStaffMemberByUsername("a1", "pepe");
    expect(r).toEqual({ ok: false, kind: "forbidden" });
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("returns invalid_username", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ role: "ADMIN" } as never);
    const r = await addStaffMemberByUsername("a1", "!!");
    expect(r).toEqual({ ok: false, kind: "invalid_username" });
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("returns not_found when there is no such user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ role: "ADMIN" } as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
    const r = await addStaffMemberByUsername("a1", "nouser_xyz");
    expect(r).toEqual({ ok: false, kind: "not_found" });
  });

  it("returns already_staff when the user is not a USER", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ role: "ADMIN" } as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({ id: "t1", role: "MOD" } as never);
    const r = await addStaffMemberByUsername("a1", "mod1");
    expect(r).toEqual({ ok: false, kind: "already_staff" });
  });
});
