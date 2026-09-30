import type { UserRole } from "@prisma/client";
import { api } from "@/features/http/apiClient";
import { COMMUNITY_RULES_VERSION } from "@/lib/auth/communityRules";
import type { AccountThemePreference } from "@/lib/theme/themeAccountSync";
export type MeUser = {
  id: string;
  username: string;
  role: UserRole;
  unreadNotifications: number;
  unreadModerationNotifications: number;
  theme: AccountThemePreference;
  rulesAccepted: boolean;
};
export const fetchMe = async (): Promise<{
  user: MeUser | null;
}> => {
  const res = await api.get<{
    user: MeUser | null;
  }>("/auth/me");
  return res.data;
};
export const fetchSocketToken = async (): Promise<string> => {
  const res = await api.get<{
    token: string;
  }>("/auth/socket");
  return res.data.token;
};
export const loginRequest = async (username: string, password: string): Promise<void> => {
  await api.post("/auth/login", { username, password });
};
export const registerRequest = async (
  username: string,
  password: string,
  turnstileToken: string | null,
): Promise<void> => {
  await api.post("/auth/register", {
    username,
    password,
    acceptRules: true,
    ...(turnstileToken ? { turnstileToken } : {}),
  });
};
export const acceptRulesRequest = async (): Promise<void> => {
  await api.post("/auth/rules", { version: COMMUNITY_RULES_VERSION });
};
export const logoutRequest = async (): Promise<void> => {
  await api.post("/auth/logout");
};
