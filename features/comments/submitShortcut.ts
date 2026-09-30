import type { CommentSubmitShortcut } from "@/features/settings/store";

type CommentSubmitKeyEvent = {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  isComposing: boolean;
};

export const shouldSubmitCommentFromKey = (
  shortcut: CommentSubmitShortcut,
  event: CommentSubmitKeyEvent,
) => {
  if (shortcut === "none" || event.key !== "Enter" || event.isComposing) return false;
  if (event.altKey || event.ctrlKey || event.metaKey) return false;
  return shortcut === "shift-enter" ? event.shiftKey : !event.shiftKey;
};

export const commentSubmitShortcutTitle = (shortcut: CommentSubmitShortcut) => {
  if (shortcut === "shift-enter") return "Shift+Enter para publicar";
  if (shortcut === "enter") return "Enter para publicar";
  return "Sin atajo de teclado para publicar";
};
