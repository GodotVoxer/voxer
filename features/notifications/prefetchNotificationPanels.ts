import { api } from "@/features/http/apiClient";
import { fetchStaffNotifications } from "@/features/moderation/api";
import {
  useNotificationPanelCacheStore,
  type UserNotificationPanelRow,
} from "@/features/notifications/panelCacheStore";

export const prefetchUserNotificationsPanel = async (userId: string): Promise<void> => {
  if (!userId) return;
  try {
    const res = await api.get<{ notifications: UserNotificationPanelRow[] }>("/notifications");
    useNotificationPanelCacheStore.getState().setUserPanel(userId, res.data.notifications);
  } catch {
    // best-effort; the dialog retries when opened
  }
};

export const prefetchStaffNotificationsPanel = async (userId: string): Promise<void> => {
  if (!userId) return;
  try {
    const list = await fetchStaffNotifications();
    useNotificationPanelCacheStore.getState().setStaffPanel(userId, list);
  } catch {
    // best-effort
  }
};
