import type { UserRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { normalizeUsername } from "@/server/auth/username";
import { isAdminRole } from "@/lib/moderation/roles";

/** An admin may not demote another admin. */
export const adminMayAssignRoleToTarget = (
  targetCurrentRole: UserRole,
  newRole: UserRole,
): boolean => {
  if (targetCurrentRole !== "ADMIN") return true;
  return newRole === "ADMIN";
};

export type StaffDirectoryRow = {
  id: string;
  username: string;
  role: UserRole;
};

export const listStaffDirectory = async (): Promise<StaffDirectoryRow[]> => {
  return prisma.user.findMany({
    where: { role: { in: ["MOD", "ADMIN"] } },
    select: { id: true, username: true, role: true },
    orderBy: { username: "asc" },
  });
};

export const setUserRoleByAdmin = async (
  actorUserId: string,
  targetUserId: string,
  role: UserRole,
): Promise<
  | { ok: true }
  | {
      ok: false;
      kind: "not_found" | "forbidden" | "cannot_demote_peer_admin" | "cannot_change_own_role";
    }
> => {
  if (actorUserId === targetUserId) {
    return { ok: false, kind: "cannot_change_own_role" };
  }
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { role: true },
  });
  if (!actor || !isAdminRole(actor.role)) return { ok: false, kind: "forbidden" };
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });
  if (!target) return { ok: false, kind: "not_found" };
  if (!adminMayAssignRoleToTarget(target.role, role)) {
    return { ok: false, kind: "cannot_demote_peer_admin" };
  }
  await prisma.user.update({
    where: { id: targetUserId },
    data: { role },
  });
  return { ok: true };
};

/** Promotes a USER to MOD by username; admins only, same rules as `setUserRoleByAdmin`. */
export const addStaffMemberByUsername = async (
  actorUserId: string,
  rawUsername: string,
): Promise<
  | { ok: true }
  | {
      ok: false;
      kind:
        | "forbidden"
        | "not_found"
        | "already_staff"
        | "invalid_username"
        | "cannot_change_own_role"
        | "cannot_demote_peer_admin";
    }
> => {
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { role: true },
  });
  if (!actor || !isAdminRole(actor.role)) return { ok: false, kind: "forbidden" };
  const username = normalizeUsername(rawUsername);
  if (!username) return { ok: false, kind: "invalid_username" };
  const target = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true, role: true },
  });
  if (!target) return { ok: false, kind: "not_found" };
  if (target.role !== "USER") return { ok: false, kind: "already_staff" };
  return setUserRoleByAdmin(actorUserId, target.id, "MOD");
};
