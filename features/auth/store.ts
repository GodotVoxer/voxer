import { create } from "zustand";
import { clearNotificationPanelCaches } from "@/features/notifications/panelCacheStore";
import { writeSessionHint } from "@/features/auth/sessionHint";
import { fetchMe, logoutRequest, type MeUser } from "./api";
type AuthUser = MeUser;
type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  authDialogOpen: boolean;
  openAuthDialog: () => void;
  closeAuthDialog: () => void;
  refresh: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  incrementUnread: () => void;
  clearUnread: () => void;
  setUnreadCounts: (counts: {
    unreadNotifications: number;
    unreadModerationNotifications: number;
  }) => void;
  logout: () => Promise<void>;
};
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  authDialogOpen: false,
  openAuthDialog: () => set({ authDialogOpen: true }),
  closeAuthDialog: () => set({ authDialogOpen: false }),
  refresh: async () => {
    try {
      const { user } = await fetchMe();
      set({ user, loading: false });
    } catch {
      clearNotificationPanelCaches();
      set({ user: null, loading: false });
    }
  },
  setUser: (user) => set({ user }),
  incrementUnread: () => {
    const u = get().user;
    if (!u) return;
    set({
      user: {
        ...u,
        unreadNotifications: u.unreadNotifications + 1,
      },
    });
  },
  clearUnread: () => {
    const u = get().user;
    if (!u) return;
    set({ user: { ...u, unreadNotifications: 0 } });
  },
  setUnreadCounts: (counts) => {
    const u = get().user;
    if (!u) return;
    set({ user: { ...u, ...counts } });
  },
  logout: async () => {
    try {
      await logoutRequest();
    } finally {
      clearNotificationPanelCaches();
      set({ user: null });
    }
  },
}));

if (typeof window !== "undefined") {
  // Only after `/auth/me` resolved: while loading, `user` is null even with a session.
  useAuthStore.subscribe((s) => {
    if (!s.loading) writeSessionHint(s.user !== null);
  });
}
