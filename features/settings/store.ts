import { create } from "zustand";
import { persist } from "zustand/middleware";

/** `localStorage` key; e2e specs seed it to fix preferences. */
export const SETTINGS_STORAGE_KEY = "voxer-settings";

export type NotificationSoundId = "silent" | "pop" | "chime" | "tick" | "custom";
export type CommentSubmitShortcut = "shift-enter" | "enter" | "none";

type State = {
  /** With sound off, videos start muted and are unmuted from their own controls. */
  videoSoundEnabled: boolean;
  /** When off, read notifications disappear from the panel. Staff reports are not affected. */
  notificationHistoryEnabled: boolean;
  /** Tapping a `>>TAG` scrolls to the comment instead of opening its card. */
  classicTagNavigation: boolean;
  /** When off, tapping an image opens the fullscreen viewer instead of a new tab. */
  openImagesInNewTab: boolean;
  /** Keyboard shortcut that submits a comment from the textarea. */
  commentSubmitShortcut: CommentSubmitShortcut;
  notificationSound: NotificationSoundId;
  /** Name of the custom file, for display only: the bytes live in IndexedDB and are never uploaded. */
  customSoundName: string | null;
  /** Dialog open state, kept here so the sidebar can open it without nesting it in the drawer. */
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  setVideoSoundEnabled: (enabled: boolean) => void;
  setNotificationHistoryEnabled: (enabled: boolean) => void;
  setClassicTagNavigation: (enabled: boolean) => void;
  setOpenImagesInNewTab: (enabled: boolean) => void;
  setCommentSubmitShortcut: (shortcut: CommentSubmitShortcut) => void;
  setNotificationSound: (sound: NotificationSoundId) => void;
  setCustomSoundName: (name: string | null) => void;
};

export const useSettingsStore = create<State>()(
  persist(
    (set) => ({
      videoSoundEnabled: true,
      notificationHistoryEnabled: true,
      classicTagNavigation: false,
      openImagesInNewTab: true,
      commentSubmitShortcut: "none",
      notificationSound: "silent",
      customSoundName: null,
      dialogOpen: false,
      setDialogOpen: (dialogOpen) => set({ dialogOpen }),
      setVideoSoundEnabled: (videoSoundEnabled) => set({ videoSoundEnabled }),
      setNotificationHistoryEnabled: (notificationHistoryEnabled) =>
        set({ notificationHistoryEnabled }),
      setClassicTagNavigation: (classicTagNavigation) => set({ classicTagNavigation }),
      setOpenImagesInNewTab: (openImagesInNewTab) => set({ openImagesInNewTab }),
      setCommentSubmitShortcut: (commentSubmitShortcut) => set({ commentSubmitShortcut }),
      setNotificationSound: (notificationSound) => set({ notificationSound }),
      setCustomSoundName: (customSoundName) =>
        set((s) => ({
          customSoundName,
          // Deleting the custom file must not leave a sound selected that no longer exists.
          notificationSound:
            customSoundName === null && s.notificationSound === "custom"
              ? "silent"
              : s.notificationSound,
        })),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      partialize: (s) => ({
        videoSoundEnabled: s.videoSoundEnabled,
        notificationHistoryEnabled: s.notificationHistoryEnabled,
        classicTagNavigation: s.classicTagNavigation,
        openImagesInNewTab: s.openImagesInNewTab,
        commentSubmitShortcut: s.commentSubmitShortcut,
        notificationSound: s.notificationSound,
        customSoundName: s.customSoundName,
      }),
    },
  ),
);
