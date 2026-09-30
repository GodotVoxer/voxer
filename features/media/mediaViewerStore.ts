import { create } from "zustand";

export type MediaViewerItem = {
  src: string;
  /** `loop` is a GIF stored as MP4, shown as a looping `<video>` like in the thread. */
  kind: "image" | "loop";
  /** Poster of the looping MP4, so the viewer is not black while it loads. */
  posterUrl?: string | null;
  alt?: string;
};

type State = {
  item: MediaViewerItem | null;
  openMediaViewer: (item: MediaViewerItem) => void;
  closeMediaViewer: () => void;
};

/** One fullscreen viewer for the whole app; one per image would mount a dialog per attachment. */
export const useMediaViewerStore = create<State>()((set) => ({
  item: null,
  openMediaViewer: (item) => set({ item }),
  closeMediaViewer: () => set({ item: null }),
}));
