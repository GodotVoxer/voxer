import { create } from "zustand";

export type PresenceState = {
  onlineCount: number | null;
  setOnlineCount: (count: number | null) => void;
};

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineCount: null,
  setOnlineCount: (onlineCount) => set({ onlineCount }),
}));
