import type { UserRole } from "@prisma/client";

export const canModerateTarget = (
  actorRole: UserRole,
  targetRole: UserRole | null,
  isOwnContent = false,
): boolean => {
  if (actorRole !== "MOD" && actorRole !== "ADMIN") return false;
  return targetRole !== "ADMIN" || (actorRole === "ADMIN" && isOwnContent);
};

export const canUndoModerationAction = (
  actorRole: UserRole,
  actionActorRole: UserRole,
  isOwnAction = false,
): boolean => canModerateTarget(actorRole, actionActorRole, isOwnAction);
