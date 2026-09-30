import { prisma } from "@/server/db/prisma";
import type { UserRole } from "@prisma/client";
import { hasAcceptedCurrentRules } from "@/lib/auth/communityRules";
import type { AccountThemePreference } from "@/lib/theme/themeAccountSync";
import { countUnreadStaffNotifications } from "@/server/moderation/staffNotifications";
import { ACCOUNT_THEME_SELECT, accountThemePreferenceFromRow } from "@/server/theme/preference";
export type MeUser = {
  id: string;
  username: string;
  role: UserRole;
  unreadNotifications: number;
  unreadModerationNotifications: number;
  theme: AccountThemePreference;
  rulesAccepted: boolean;
};
export const getMeForUserId = async (userId: string): Promise<MeUser | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      rulesAcceptedVersion: true,
      ...ACCOUNT_THEME_SELECT,
    },
  });
  if (!user) return null;
  const [unreadNotifications, unreadModerationNotifications] = await Promise.all([
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
    user.role === "USER" ? Promise.resolve(0) : countUnreadStaffNotifications(userId),
  ]);
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    unreadNotifications,
    unreadModerationNotifications,
    theme: accountThemePreferenceFromRow(user),
    rulesAccepted: hasAcceptedCurrentRules(user.rulesAcceptedVersion),
  };
};
