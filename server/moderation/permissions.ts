import type { UserRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export type StaffUser = {
  id: string;
  username: string;
  role: UserRole;
};

export const getStaffUser = async (userId: string): Promise<StaffUser | null> => {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true },
  });
  if (!u || u.role === "USER") return null;
  return u;
};

export const listStaffUserIds = async (): Promise<string[]> => {
  const rows = await prisma.user.findMany({
    where: { role: { in: ["MOD", "ADMIN"] } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
};
