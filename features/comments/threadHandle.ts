export type CommentThreadHandle = {
  scrollToPublicTag: (tagUpper: string) => void;
  scrollScrollAreaToTop: () => void;
  scrollToOldestComment: () => void;
};
