import { api } from "@/features/http/apiClient";
import { sha256HexFromBlob } from "@/features/media/sha256Hex";
import { prepareClientImageFileForUpload } from "@/features/media/clientImagePrep";
import { clientUploadSizeRejectionMessage } from "@/features/media/uploadClientGuard";
import { isLocalVoxUploadVideoFile } from "@/features/media/uploadClientFiles";
import { assertFitsHostingMultipartBodyLimit } from "@/features/media/multipartUploadLimit";
import type {
  CommentPublic,
  VoxDetail,
  VoxListPage,
  VoxListView,
  VoxPollPublic,
} from "@/lib/vox/types";
import { videoContainerOf, videoMimeOf } from "@/lib/media/videoFormat";
import { apiErrorStatus } from "@/features/http/responseErrors";

type UploadResult = {
  kind: "IMAGE" | "UPLOADED_VIDEO";
  mediaUrl: string;
  thumbnailUrl: string;
  /** An animated GIF the server stored as MP4, shown looped without controls. Only with `kind: "IMAGE"`. */
  animatedImage?: boolean;
};

export type UploadIntent = "vox" | "comment";

const postRawFormUpload = async (file: File, intent: UploadIntent): Promise<UploadResult> => {
  const form = new FormData();
  form.set("file", file);
  form.set("intent", intent);
  const res = await api.post<UploadResult>("/upload", form);
  return res.data;
};

type BlobTokenImageResponse =
  | {
      deduped: true;
      kind: "IMAGE";
      mediaUrl: string;
      thumbnailUrl: string;
      animatedImage?: boolean;
    }
  | { uploadUrl: string; publicUrl: string; pathname: string };

type BlobTokenVideoResponse = { uploadUrl: string; publicUrl: string; pathname: string };

const putToPresignedUploadUrl = async (
  uploadUrl: string,
  body: File | Blob,
  contentType: string,
): Promise<void> => {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });
  if (!res.ok) {
    throw new Error(`Falló la subida al almacenamiento (${res.status}).`);
  }
};

const postVideoViaBlobClientIfAvailable = async (
  file: File,
  intent: UploadIntent,
): Promise<UploadResult | null> => {
  try {
    const contentType = videoMimeOf(videoContainerOf(file.type, file.name));
    const { data } = await api.post<BlobTokenVideoResponse>("/upload/blob-token", {
      kind: "video",
      contentType,
      size: file.size,
      intent,
    });
    if (!("uploadUrl" in data) || !("publicUrl" in data) || !("pathname" in data)) {
      throw new Error("Respuesta inválida del servidor al preparar la subida.");
    }
    const { uploadUrl, publicUrl } = data;
    await putToPresignedUploadUrl(uploadUrl, file, contentType);
    const fin = await api.post<UploadResult>("/upload/blob-video-finalize", { url: publicUrl });
    return fin.data;
  } catch (e) {
    if (apiErrorStatus(e) === 503) {
      return null;
    }
    throw e;
  }
};

const postImageViaBlobClientIfAvailable = async (
  file: File,
  intent: UploadIntent,
): Promise<UploadResult | null> => {
  try {
    // The hash only enables the dedupe shortcut; computing it reads the whole file into memory, which
    // some files do not allow even though they upload fine as a stream. The server recomputes it.
    const contentSha256 = await sha256HexFromBlob(file).catch(() => undefined);
    const { data } = await api.post<BlobTokenImageResponse>("/upload/blob-token", {
      kind: "image",
      contentType: file.type || "application/octet-stream",
      size: file.size,
      intent,
      ...(contentSha256 ? { contentSha256 } : {}),
    });
    if ("deduped" in data && data.deduped) {
      return {
        kind: "IMAGE",
        mediaUrl: data.mediaUrl,
        thumbnailUrl: data.thumbnailUrl,
        animatedImage: data.animatedImage ?? false,
      };
    }
    if (!("uploadUrl" in data) || !("publicUrl" in data) || !("pathname" in data)) {
      throw new Error("Respuesta inválida del servidor al preparar la subida.");
    }
    const { uploadUrl, publicUrl } = data;
    const ct = file.type || "application/octet-stream";
    await putToPresignedUploadUrl(uploadUrl, file, ct);
    const fin = await api.post<UploadResult>("/upload/blob-image-finalize", { url: publicUrl });
    return fin.data;
  } catch (e) {
    if (apiErrorStatus(e) === 503) {
      return null;
    }
    throw e;
  }
};

export const getVoxListPage = async (opts?: {
  view?: VoxListView;
  cursor?: string | null;
  limit?: number;
  /** URL code (e.g. GEN); the server filters by category. */
  categoryCode?: string | null;
  /** Title search for the main list; not combined with `categoryCode`. */
  searchQuery?: string | null;
}): Promise<VoxListPage> => {
  const view: VoxListView = opts?.view ?? "default";
  const cat = opts?.categoryCode?.trim();
  const q = opts?.searchQuery?.trim();
  const res = await api.get<VoxListPage>("/vox", {
    params: {
      ...(view !== "default" ? { view } : {}),
      ...(cat ? { categoryCode: cat.toUpperCase() } : {}),
      ...(q ? { q } : {}),
      cursor: opts?.cursor ?? undefined,
      limit: opts?.limit ?? 24,
    },
  });
  return res.data;
};
export const getVoxById = async (id: string): Promise<VoxDetail> => {
  const res = await api.get<VoxDetail>(`/vox/${id}`);
  return res.data;
};

/** Public poll of the vox, fetched separately from the detail; `poll` is null without one. */
export const getVoxPollById = async (
  voxId: string,
  signal?: AbortSignal,
): Promise<VoxPollPublic | null> => {
  const path = `/vox/${voxId}/poll`;
  const res = signal
    ? await api.get<{ poll: VoxPollPublic | null }>(path, { signal })
    : await api.get<{ poll: VoxPollPublic | null }>(path);
  return res.data.poll;
};
export const fetchCommentsPage = async (
  voxId: string,
  opts?: {
    cursor?: string;
    limit?: number;
    /** With `afterId`: only newer comments, ascending. */
    afterCreatedAt?: string;
    afterId?: string;
    signal?: AbortSignal;
  },
): Promise<{
  comments: CommentPublic[];
  nextCursor: string | null;
}> => {
  const res = await api.get<{
    comments: CommentPublic[];
    nextCursor: string | null;
  }>(`/vox/${voxId}/comments`, {
    signal: opts?.signal,
    params: {
      cursor: opts?.cursor,
      limit: opts?.limit ?? 150,
      afterCreatedAt: opts?.afterCreatedAt,
      afterId: opts?.afterId,
    },
  });
  return res.data;
};
export const postComment = async (
  voxId: string,
  body: {
    body: string;
    displayName?: string;
    imageUrl?: string;
    videoUrl?: string;
    videoPosterUrl?: string;
    animatedImage?: boolean;
    youtubeUrl?: string;
    showStaffIdentity?: boolean;
    pollDisclosureOptionId?: string | null;
  },
): Promise<CommentPublic> => {
  const res = await api.post<CommentPublic>(`/vox/${voxId}/comments`, body);
  return res.data;
};
export const postPollVote = async (voxId: string, optionId: string): Promise<VoxPollPublic> => {
  const res = await api.post<{ poll: VoxPollPublic }>(`/vox/${voxId}/poll/vote`, { optionId });
  return res.data.poll;
};
export const createVox = async (body: {
  title: string;
  description: string;
  category: string;
  mediaType: "IMAGE" | "UPLOADED_VIDEO" | "YOUTUBE";
  mediaUrl?: string;
  thumbnailUrl?: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  threadUniqueIdsEnabled?: boolean;
  countryFlagsEnabled?: boolean;
  animatedImage?: boolean;
  poll?: { options: string[] };
}): Promise<{
  id: string;
}> => {
  const res = await api.post<{
    id: string;
  }>("/vox", body);
  return res.data;
};
export const uploadMedia = async (
  file: File,
  opts?: { intent?: UploadIntent },
): Promise<UploadResult> => {
  const intent: UploadIntent = opts?.intent === "comment" ? "comment" : "vox";
  const rejectIfTooLarge = (f: File) => {
    const sizeMsg = clientUploadSizeRejectionMessage(f);
    if (sizeMsg) {
      const err = new Error(sizeMsg) as Error & {
        response?: { data: { error: string }; status: number };
      };
      err.response = { data: { error: sizeMsg }, status: 400 };
      throw err;
    }
  };
  if (isLocalVoxUploadVideoFile(file)) {
    rejectIfTooLarge(file);
    // The server extracts the poster with ffmpeg on finalize (`server/media/videoPoster.ts`).
    const viaBlob = await postVideoViaBlobClientIfAvailable(file, intent);
    if (!viaBlob) {
      assertFitsHostingMultipartBodyLimit(file.size);
    }
    return viaBlob ?? (await postRawFormUpload(file, intent));
  }
  const prepared = await prepareClientImageFileForUpload(file);
  rejectIfTooLarge(prepared);
  const viaBlob = await postImageViaBlobClientIfAvailable(prepared, intent);
  if (viaBlob) {
    return viaBlob;
  }
  assertFitsHostingMultipartBodyLimit(prepared.size);
  return postRawFormUpload(prepared, intent);
};
export const followVox = async (voxId: string): Promise<void> => {
  await api.post(`/vox/${voxId}/follow`);
};
export const unfollowVox = async (voxId: string): Promise<void> => {
  await api.delete(`/vox/${voxId}/follow`);
};
export const muteCommentReplies = async (commentId: string): Promise<void> => {
  await api.post(`/comments/${commentId}/mute`);
};
export const unmuteCommentReplies = async (commentId: string): Promise<void> => {
  await api.delete(`/comments/${commentId}/mute`);
};
export const pinComment = async (commentId: string): Promise<string | null> => {
  const { data } = await api.post<{ pinnedAt: string | null }>(`/comments/${commentId}/pin`);
  return data.pinnedAt;
};
export const unpinComment = async (commentId: string): Promise<void> => {
  await api.delete(`/comments/${commentId}/pin`);
};
export const hideVox = async (voxId: string): Promise<void> => {
  await api.post(`/vox/${voxId}/hide`);
};
export const unhideVox = async (voxId: string): Promise<void> => {
  await api.delete(`/vox/${voxId}/hide`);
};
export const favoriteVox = async (voxId: string): Promise<void> => {
  await api.post(`/vox/${voxId}/favorite`);
};
export const unfavoriteVox = async (voxId: string): Promise<void> => {
  await api.delete(`/vox/${voxId}/favorite`);
};
export const toggleModerationVoxPin = async (
  voxId: string,
): Promise<{ ok: true; pinnedAt: string | null }> => {
  const res = await api.post<{ ok: true; pinnedAt: string | null }>(
    `/moderation/vox/${encodeURIComponent(voxId)}/pin`,
  );
  return res.data;
};
