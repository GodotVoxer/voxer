"use client";
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/features/auth/store";
import { useSettingsStore } from "@/features/settings/store";
import { playNotificationSound } from "@/features/settings/notificationSounds";

/** Plays when a live event increments the bell counter; user notifications only (staff reports have their own bell). */
export const NotificationSoundPlayer = () => {
  const userId = useAuthStore((s) => s.user?.id);
  const unread = useAuthStore((s) => s.user?.unreadNotifications ?? 0);
  /** `null` until the first read: arriving with unread notifications is not a new one. */
  const previousRef = useRef<number | null>(null);

  useEffect(() => {
    previousRef.current = null;
  }, [userId]);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = unread;
    if (previous === null || unread <= previous) return;
    playNotificationSound(useSettingsStore.getState().notificationSound);
  }, [unread]);

  return null;
};
