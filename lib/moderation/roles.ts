import type { UserRole } from "@prisma/client";

export const isStaffRole = (role: UserRole | undefined): boolean =>
  role === "MOD" || role === "ADMIN";

export const isAdminRole = (role: UserRole | undefined): boolean => role === "ADMIN";

/** Another admin's identity stays hidden from staff; each admin still sees their own content. */
export const hidesAdminIdentity = (
  authorRole: UserRole | null | undefined,
  authorId: string | null,
  viewerId: string,
): boolean => authorRole === "ADMIN" && authorId !== viewerId;
