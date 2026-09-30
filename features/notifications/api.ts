import { api } from "@/features/http/apiClient";

/** Returns how many notifications were marked, to skip a refresh when there were none. */
export const postMarkNotificationsReadForVox = async (voxId: string): Promise<number> => {
  const res = await api.post<{ ok: boolean; marked: number }>("/notifications/mark-read", {
    voxId,
  });
  return res.data.marked ?? 0;
};
