import { NextResponse } from "next/server";
import { z } from "zod";
import type { StoredMediaKind } from "@prisma/client";
import { invalidRequest, jsonError, readJsonBody } from "@/server/http/apiErrors";
import { UPLOAD_MAX_VIDEO_BYTES } from "@/lib/media/uploadLimits";
import { sha256HexFromBuffer } from "@/server/media/sha256Hex";
import { lookupStoredMediaByHash, recordStoredMediaByHash } from "@/server/media/storedMediaByHash";
import { UPLOAD_BLOCKED_MEDIA_ES } from "@/lib/media/uploadBlockedMedia";
import { type R2ObjectReadResult, readR2ObjectBuffer } from "@/server/storage/r2Storage";
import {
  type SavedUpload,
  discardSavedR2Upload,
  savePreparedStrippedVideo,
} from "@/server/media/imageProcess";
import {
  StripVideoMetadataError,
  VIDEO_METADATA_STRIP_FAILED_ES,
  stripVideoMetadataBuffer,
} from "@/server/media/stripVideoMetadata";
import { blobPathnameFromFinalizeUrl } from "@/server/upload/blobFinalizeUrl";
import { UPLOAD_SERVICE_UNAVAILABLE_ES } from "@/lib/media/uploadUnavailable";
import {
  buildStrippedVideoPosterUrl,
  ensureDedupedVideoPosterUrl,
} from "@/server/media/videoPoster";
import {
  completeBlobUpload,
  discardBlobUpload,
  verifyBlobFinalizeAuthorization,
} from "@/server/upload/blobPendingFinalize";
import { guardUploadRequest } from "@/server/upload/guard";
import { VIDEO_MIME_TYPES, videoContainerOf, videoMimeOf } from "@/lib/media/videoFormat";

export const runtime = "nodejs";

const bodySchema = z.object({
  url: z.string().url(),
});

const isAllowedFetchedVideo = (contentType: string, pathname: string): boolean => {
  const m = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  if ((VIDEO_MIME_TYPES as readonly string[]).includes(m)) return true;
  if (!m || m === "application/octet-stream" || m === "binary/octet-stream") {
    return /\.(mp4|webm)$/i.test(pathname);
  }
  return false;
};

export const POST = async (req: Request) => {
  const guard = await guardUploadRequest(req, {
    rateLimit: "upload-blob-video-finalize",
    requiresBucket: true,
  });
  if ("error" in guard) return guard.error;
  const { userId } = guard;
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const json = jsonBody.body;
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return invalidRequest();
  }
  const { url } = parsed.data;
  const pathname = blobPathnameFromFinalizeUrl(url, "video");
  if (!pathname) {
    return jsonError("URL de video no permitida", 400);
  }
  const authorized = await verifyBlobFinalizeAuthorization(pathname, userId);
  if (!authorized) {
    return jsonError("No tenés permiso para finalizar esta subida.", 403);
  }
  let read: R2ObjectReadResult;
  try {
    read = await readR2ObjectBuffer(pathname, UPLOAD_MAX_VIDEO_BYTES);
  } catch {
    await discardBlobUpload(pathname, userId);
    return jsonError("No se pudo leer el video subido", 502);
  }
  if (!read.ok) {
    await discardBlobUpload(pathname, userId);
    return read.reason === "too_large"
      ? jsonError("El video es demasiado grande", 413)
      : jsonError("No se pudo leer el video subido", 502);
  }
  if (!isAllowedFetchedVideo(read.contentType, pathname)) {
    await discardBlobUpload(pathname, userId);
    return jsonError("Tipo de video no permitido", 415);
  }
  const buf = read.body;
  const stripExt = videoContainerOf(pathname);
  let stripped: Buffer;
  try {
    stripped = await stripVideoMetadataBuffer(buf, stripExt);
  } catch (e) {
    await discardBlobUpload(pathname, userId);
    if (e instanceof StripVideoMetadataError && e.code === "FFMPEG_MISSING") {
      console.error("[blob-video-finalize] ffmpeg unavailable:", e.message);
      return jsonError(UPLOAD_SERVICE_UNAVAILABLE_ES, 503);
    }
    return jsonError(VIDEO_METADATA_STRIP_FAILED_ES, 415);
  }
  const sha = sha256HexFromBuffer(stripped);
  const stored = await lookupStoredMediaByHash(sha);
  if (stored === "blocked") {
    await discardBlobUpload(pathname, userId);
    return jsonError(UPLOAD_BLOCKED_MEDIA_ES, 403);
  }
  const dup = stored;
  if (dup?.kind === "UPLOADED_VIDEO") {
    await discardBlobUpload(pathname, userId);
    return NextResponse.json({
      kind: "UPLOADED_VIDEO" as const,
      mediaUrl: dup.mediaUrl,
      thumbnailUrl: await ensureDedupedVideoPosterUrl(sha, dup.thumbnailUrl, stripped, stripExt),
    });
  }
  let saved: SavedUpload | null = null;
  try {
    // Always a new key, never the original's: rewriting it lets CDNs and browsers mix byte ranges of
    // two versions (the `mdat` moves) and the video freezes.
    saved = await savePreparedStrippedVideo(stripped, stripExt);
    // The poster joins `saved` so a later failure removes it too.
    saved = { ...saved, thumbnailUrl: await buildStrippedVideoPosterUrl(stripped, stripExt) };
    await recordStoredMediaByHash({
      sha256Hex: sha,
      kind: "UPLOADED_VIDEO" as StoredMediaKind,
      mediaUrl: saved.mediaUrl,
      thumbnailUrl: saved.thumbnailUrl,
      byteSize: stripped.length,
      mimeType: videoMimeOf(stripExt),
    });
  } catch {
    if (saved) await discardSavedR2Upload(saved);
    await discardBlobUpload(pathname, userId);
    return jsonError("No se pudo guardar el video", 500);
  }
  await completeBlobUpload(pathname, userId);
  return NextResponse.json({
    kind: "UPLOADED_VIDEO" as const,
    mediaUrl: saved.mediaUrl,
    thumbnailUrl: saved.thumbnailUrl,
  });
};
