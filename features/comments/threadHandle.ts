export type CommentThreadHandle = {
  scrollToPublicTag: (tagUpper: string) => void;
  /** Only for the comments panel scroll (desktop); on mobile the page scrolls, not the thread. */
  scrollScrollAreaToTop: () => void;
  scrollToOldestComment: () => void;
};
