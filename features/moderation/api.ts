import type { ReportReason } from "@prisma/client";
import { api } from "@/features/http/apiClient";
import type { ModerationAuthorPublicationsPage } from "@/lib/moderation/authorPublicationsTypes";
import type { StaffPublicationModTarget } from "@/features/moderation/types";
import type { CommentPublic } from "@/lib/vox/types";
import type { BanContentMedia, BanContentWindow } from "@/features/moderation/publicationPlan";

export type ModerationBanContentBody = BanContentWindow & { media?: BanContentMedia };

export type AuthorContentCounts = { voxCount: number; commentCount: number; mediaCount: number };

export const postReport = async (body: {
  voxId: string;
  commentId?: string;
  reason: ReportReason;
  details?: string;
}): Promise<void> => {
  await api.post("/reports", body);
};

export type StaffNotificationRow = {
  id: string;
  message: string;
  thumbnailUrl: string | null;
  voxId: string;
  commentHash: string | null;
  readAt: string | null;
  createdAt: string;
  reportDetails?: string | null;
};

export const fetchStaffNotifications = async (): Promise<StaffNotificationRow[]> => {
  const res = await api.get<{ notifications: StaffNotificationRow[] }>("/moderation/notifications");
  return res.data.notifications;
};

export const postMarkStaffNotificationsReadForVox = async (voxId: string): Promise<number> => {
  const res = await api.post<{ ok: boolean; marked: number }>(
    "/moderation/notifications/mark-read",
    {
      voxId,
    },
  );
  return res.data.marked;
};

export const clearStaffNotifications = async (): Promise<void> => {
  await api.delete("/moderation/notifications");
};

export type ModerationActionRow = {
  id: string;
  actionType: string;
  payload: unknown;
  relatedBanId: string | null;
  createdAt: string;
  undoneAt: string | null;
  actorUsername: string;
  actorRole: "USER" | "MOD" | "ADMIN";
};

export const fetchModerationActions = async (opts?: {
  cursor?: string;
  actorUserId?: string;
  actorUsername?: string;
  banId?: string;
  signal?: AbortSignal;
}): Promise<{ actions: ModerationActionRow[]; nextCursor: string | null }> => {
  const res = await api.get<{
    actions: ModerationActionRow[];
    nextCursor: string | null;
  }>("/moderation/actions", {
    params: {
      cursor: opts?.cursor,
      actorUserId: opts?.actorUserId,
      actorUsername: opts?.actorUsername,
      banId: opts?.banId,
    },
    signal: opts?.signal,
  });
  return res.data;
};

export const undoModerationActionRequest = async (actionId: string): Promise<void> => {
  await api.post(`/moderation/actions/${actionId}/undo`);
};

export type StaffDirectoryUser = {
  id: string;
  username: string;
  role: string;
};

export const fetchStaffDirectory = async (): Promise<StaffDirectoryUser[]> => {
  const res = await api.get<{ users: StaffDirectoryUser[] }>("/moderation/staff");
  return res.data.users;
};

export const patchUserRole = async (
  userId: string,
  role: "USER" | "MOD" | "ADMIN",
): Promise<void> => {
  await api.patch(`/moderation/users/${userId}/role`, { role });
};

export const postStaffAddByUsername = async (username: string): Promise<void> => {
  await api.post("/moderation/staff", { username });
};

export const postModerationBan = async (body: {
  targetUserId: string;
  reason: string;
  unit: "MINUTES" | "HOURS" | "DAYS";
  value: number;
  /** HMAC fingerprint of the latest post; the server never keeps the plain IP. */
  blockClientNetwork?: boolean;
}): Promise<{ banId: string; actionId: string }> => {
  const res = await api.post<{ banId: string; actionId: string }>("/moderation/ban", body);
  return res.data;
};

export const fetchModerationVoxOwnerId = async (
  voxId: string,
): Promise<{ ownerId: string | null }> => {
  const res = await api.get<{ ownerId: string | null }>(`/moderation/vox/${voxId}/owner`);
  return res.data;
};

export const fetchModerationCommentAuthorId = async (
  commentId: string,
): Promise<{ authorId: string | null }> => {
  const res = await api.get<{ authorId: string | null }>(
    `/moderation/comments/${commentId}/author`,
  );
  return res.data;
};

export const deleteVoxAsModerator = async (voxId: string): Promise<void> => {
  await api.post(`/moderation/vox/${voxId}/delete`);
};

export const deleteCommentAsModerator = async (commentId: string): Promise<void> => {
  await api.post(`/moderation/comments/${commentId}/delete`);
};

export const purgePublicationMediaAsModerator = async (
  target: StaffPublicationModTarget,
  options: { block?: boolean } = {},
): Promise<void> => {
  const body = options.block ? { block: true } : {};
  if (target.kind === "vox") {
    await api.post(`/moderation/vox/${target.voxId}/purge-media`, body);
    return;
  }
  await api.post(`/moderation/comments/${target.commentId}/purge-media`, body);
};

export const patchVoxCategoryAsModerator = async (
  voxId: string,
  category: string,
): Promise<void> => {
  await api.patch(`/moderation/vox/${voxId}/category`, { category });
};

/** Only the admin who owns the vox; the server re-checks role and ownership. */
export const patchOwnCommentAsAdmin = async (
  commentId: string,
  body: { body: string; showStaffIdentity: boolean; showOpIdentity: boolean },
): Promise<CommentPublic> => {
  const res = await api.patch<{ comment: CommentPublic }>(
    `/moderation/comments/${encodeURIComponent(commentId)}/edit`,
    body,
  );
  return res.data.comment;
};

export const patchOwnVoxAsAdmin = async (
  voxId: string,
  body: { title: string; description: string },
): Promise<{ title: string; description: string }> => {
  const res = await api.patch<{ title: string; description: string }>(
    `/moderation/vox/${encodeURIComponent(voxId)}/edit`,
    body,
  );
  return { title: res.data.title, description: res.data.description };
};

export const banUserContentAsModerator = async (
  targetUserId: string,
  body: ModerationBanContentBody,
): Promise<void> => {
  await api.post(`/moderation/users/${targetUserId}/ban-content`, body);
};

export const fetchAuthorContentCounts = async (
  targetUserId: string,
  window: BanContentWindow,
  signal?: AbortSignal,
): Promise<AuthorContentCounts> => {
  const res = await api.get<AuthorContentCounts>(`/moderation/users/${targetUserId}/ban-content`, {
    params: window.forever
      ? { forever: "true" }
      : { forever: "false", amount: window.amount, unit: window.unit },
    signal,
  });
  return res.data;
};

export const fetchModerationAuthorPublications = async (opts: {
  voxId?: string;
  commentId?: string;
  cursor?: string | null;
  limit?: number;
}): Promise<ModerationAuthorPublicationsPage> => {
  const res = await api.get<ModerationAuthorPublicationsPage>("/moderation/author-publications", {
    params: {
      ...(opts.voxId ? { voxId: opts.voxId } : {}),
      ...(opts.commentId ? { commentId: opts.commentId } : {}),
      ...(opts.cursor ? { cursor: opts.cursor } : {}),
      ...(opts.limit != null ? { limit: opts.limit } : {}),
    },
  });
  return res.data;
};

export const fetchModerationActionPreview = async (actionId: string, offset = 0) => {
  const response = await api.get<
    import("@/lib/moderation/actionPreviewTypes").ModerationActionPreviewPage
  >(`/moderation/actions/${encodeURIComponent(actionId)}/preview`, { params: { offset } });
  return response.data;
};
