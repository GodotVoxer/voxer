import { api } from "@/features/http/apiClient";
import type { MyCommentsPage } from "@/lib/comments/myCommentsTypes";

export const fetchMyComments = async (options?: {
  cursor?: string | null;
  query?: string;
  signal?: AbortSignal;
}): Promise<MyCommentsPage> => {
  const { data } = await api.get<MyCommentsPage>("/me/comments", {
    params: {
      ...(options?.cursor ? { cursor: options.cursor } : {}),
      ...(options?.query ? { q: options.query } : {}),
    },
    signal: options?.signal,
  });
  return data;
};
