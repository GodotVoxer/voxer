import { create } from "zustand";
import type { StaffNotificationRow } from "@/features/moderation/api";

export type UserNotificationPanelRow = {
  id: string;
  message: string;
  thumbnailUrl: string | null;
  voxId: string;
  commentPublicTag: string | null;
  commentPreview?: string | null;
  readAt: string | null;
  createdAt: string;
};

type OwnerList<T> = { ownerId: string; items: T[] };

type PanelCacheState = {
  userByOwner: OwnerList<UserNotificationPanelRow> | null;
  staffByOwner: OwnerList<StaffNotificationRow> | null;
  setUserPanel: (ownerId: string, items: UserNotificationPanelRow[]) => void;
  setStaffPanel: (ownerId: string, items: StaffNotificationRow[]) => void;
  clear: () => void;
};

export const useNotificationPanelCacheStore = create<PanelCacheState>((set) => ({
  userByOwner: null,
  staffByOwner: null,
  setUserPanel: (ownerId, items) => set({ userByOwner: { ownerId, items } }),
  setStaffPanel: (ownerId, items) => set({ staffByOwner: { ownerId, items } }),
  clear: () => set({ userByOwner: null, staffByOwner: null }),
}));

export const clearNotificationPanelCaches = (): void => {
  useNotificationPanelCacheStore.getState().clear();
};
