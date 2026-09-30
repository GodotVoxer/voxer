"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store";
import { titleWithUnreadCount } from "@/features/notifications/documentTitleUnreadCount";

/** `(N) Voxer | ...` in the tab. Next rewrites `document.title` on every navigation, so the prefix is reapplied when `<title>` changes. */
export const DocumentTitleUnreadCount = () => {
  const unread = useAuthStore((s) =>
    s.user ? s.user.unreadNotifications + s.user.unreadModerationNotifications : 0,
  );

  useEffect(() => {
    const apply = () => {
      const next = titleWithUnreadCount(document.title, unread);
      // Comparing avoids a loop with the observer: writing the same value triggers nothing.
      if (document.title !== next) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      const clean = titleWithUnreadCount(document.title, 0);
      if (document.title !== clean) document.title = clean;
    };
  }, [unread]);

  return null;
};
