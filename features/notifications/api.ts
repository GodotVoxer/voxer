import { api } from "@/features/http/apiClient";

/** Returns how many notifications were marked, to skip a refresh when there were none. */
export const postMarkNotificationsReadForVox = async (voxId: string): Promise<number> => {
  const res = await api.post<{ ok: boolean; marked: number }>("/notifications/mark-read", {
    voxId,
  });
  return res.data.marked ?? 0;
};

/**
 * Marks only the notifications of comments up to `seenThrough` (the newest one on screen) and returns
 * how many of the vox stay unread. An older server ignores the limit and answers without `remaining`.
 */
export const postMarkSeenNotificationsReadForVox = async (
  voxId: string,
  seenThrough: string | null,
): Promise<{ marked: number; remaining: number }> => {
  const res = await api.post<{ ok: boolean; marked?: number; remaining?: number }>(
    "/notifications/mark-read",
    { voxId, seenThrough },
  );
  return { marked: res.data.marked ?? 0, remaining: res.data.remaining ?? 0 };
};
