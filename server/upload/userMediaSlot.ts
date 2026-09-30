import { prisma } from "@/server/db/prisma";
import {
  COMMENT_MEDIA_UPLOAD_WINDOW_MS,
  COMMENT_MEDIA_UPLOADS_PER_WINDOW,
  VOX_CREATE_INTERVAL_MS,
  VOX_MEDIA_UPLOADS_PER_WINDOW,
} from "@/lib/limits";
import { formatRetryAfterDurationEs } from "@/lib/format/retryAfter";
import { decideMediaUploadSlot } from "@/server/upload/userWindow";

const voxMediaRateLimitedMessage = (retryAfterMs: number): string =>
  `Llegaste al límite de subidas de archivos. Podés volver a publicar un vox con portada en ${formatRetryAfterDurationEs(retryAfterMs)}.`;

const commentMediaRateLimitedMessage = (retryAfterMs: number): string =>
  `Alcanzaste el límite de subidas de adjuntos. Probá de nuevo en ${formatRetryAfterDurationEs(retryAfterMs)}.`;

export type MediaUploadIntent = "vox" | "comment";

const reserveVoxMediaUpload = async (
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> => {
  const now = new Date();
  const nowMs = now.getTime();
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          mediaUploadWindowStartAt: true,
          mediaUploadCountInWindow: true,
        },
      });
      if (!user) {
        return { ok: false, message: "Sesión inválida." };
      }
      const startMs = user.mediaUploadWindowStartAt?.getTime() ?? null;
      const count = user.mediaUploadCountInWindow ?? 0;
      const decision = decideMediaUploadSlot(
        nowMs,
        startMs,
        count,
        VOX_CREATE_INTERVAL_MS,
        VOX_MEDIA_UPLOADS_PER_WINDOW,
      );
      if (!decision.allowed) {
        return { ok: false, message: voxMediaRateLimitedMessage(decision.retryAfterMs) };
      }
      await tx.user.update({
        where: { id: userId },
        data: {
          mediaUploadWindowStartAt: new Date(decision.nextWindowStartMs),
          mediaUploadCountInWindow: decision.nextCount,
        },
      });
      return { ok: true };
    });
  } catch {
    return { ok: false, message: "No se pudo validar la subida." };
  }
};

const reserveCommentMediaUpload = async (
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> => {
  const now = new Date();
  const nowMs = now.getTime();
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          commentMediaUploadWindowStartAt: true,
          commentMediaUploadCountInWindow: true,
        },
      });
      if (!user) {
        return { ok: false, message: "Sesión inválida." };
      }
      const startMs = user.commentMediaUploadWindowStartAt?.getTime() ?? null;
      const count = user.commentMediaUploadCountInWindow ?? 0;
      const decision = decideMediaUploadSlot(
        nowMs,
        startMs,
        count,
        COMMENT_MEDIA_UPLOAD_WINDOW_MS,
        COMMENT_MEDIA_UPLOADS_PER_WINDOW,
      );
      if (!decision.allowed) {
        return { ok: false, message: commentMediaRateLimitedMessage(decision.retryAfterMs) };
      }
      await tx.user.update({
        where: { id: userId },
        data: {
          commentMediaUploadWindowStartAt: new Date(decision.nextWindowStartMs),
          commentMediaUploadCountInWindow: decision.nextCount,
        },
      });
      return { ok: true };
    });
  } catch {
    return { ok: false, message: "No se pudo validar la subida." };
  }
};

export const reserveMediaUploadSlot = async (
  userId: string,
  intent: MediaUploadIntent,
): Promise<{ ok: true } | { ok: false; message: string }> => {
  if (intent === "comment") {
    return reserveCommentMediaUpload(userId);
  }
  return reserveVoxMediaUpload(userId);
};
