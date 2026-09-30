import { NextResponse } from "next/server";
import type { StoredMediaKind } from "@prisma/client";
import {
  ImageDimensionLimitError,
  prepareImageBuffers,
  persistPreparedImagePair,
  savePreparedStrippedVideo,
} from "@/server/media/imageProcess";
import {
  StripVideoMetadataError,
  VIDEO_METADATA_STRIP_FAILED_ES,
  stripVideoMetadataBuffer,
} from "@/server/media/stripVideoMetadata";
import { jsonError } from "@/server/http/apiErrors";
import { reserveMediaUploadSlot, type MediaUploadIntent } from "@/server/upload/userMediaSlot";
import {
  UPLOAD_MAX_IMAGE_BYTES,
  UPLOAD_MAX_VIDEO_BYTES,
  uploadImageLimitMessageEs,
} from "@/lib/media/uploadLimits";
import { sha256HexFromBuffer } from "@/server/media/sha256Hex";
import { lookupStoredMediaByHash, recordStoredMediaByHash } from "@/server/media/storedMediaByHash";
import { UPLOAD_BLOCKED_MEDIA_ES } from "@/lib/media/uploadBlockedMedia";
import { UPLOAD_SERVICE_UNAVAILABLE_ES } from "@/lib/media/uploadUnavailable";
import {
  buildStrippedVideoPosterUrl,
  ensureDedupedVideoPosterUrl,
} from "@/server/media/videoPoster";
import { guardUploadRequest } from "@/server/upload/guard";
import { VIDEO_MIME_TYPES, videoContainerOf } from "@/lib/media/videoFormat";
export const runtime = "nodejs";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES: ReadonlySet<string> = new Set(VIDEO_MIME_TYPES);
const extFromName = (name: string): string => {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1) : "";
};
export const POST = async (req: Request) => {
  const guard = await guardUploadRequest(req, { rateLimit: "upload", requiresBucket: false });
  if ("error" in guard) return guard.error;
  const { userId } = guard;
  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > UPLOAD_MAX_VIDEO_BYTES + 1024 * 1024) {
    return jsonError("El archivo es demasiado grande", 413);
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Formulario inválido", 400);
  }
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return jsonError("Falta el archivo", 400);
  }
  const intentRaw = (form.get("intent") as string | null)?.toLowerCase();
  const intent: MediaUploadIntent = intentRaw === "comment" ? "comment" : "vox";
  const mime = file.type || "application/octet-stream";
  const size = file.size;
  const originalName = file.name || "upload";
  const ext = extFromName(originalName);
  if (!IMAGE_TYPES.has(mime) && !VIDEO_TYPES.has(mime)) {
    return jsonError("Tipo de archivo no permitido", 415);
  }
  if (IMAGE_TYPES.has(mime) && size > UPLOAD_MAX_IMAGE_BYTES) {
    return jsonError("La imagen es demasiado grande", 413);
  }
  if (VIDEO_TYPES.has(mime) && size > UPLOAD_MAX_VIDEO_BYTES) {
    return jsonError("El video es demasiado grande", 413);
  }
  const slot = await reserveMediaUploadSlot(userId, intent);
  if (!slot.ok) {
    return jsonError(slot.message, 429);
  }
  if (IMAGE_TYPES.has(mime)) {
    const buf = Buffer.from(await file.arrayBuffer());
    try {
      const prepared = await prepareImageBuffers(buf, ext || "jpg");
      const sha = sha256HexFromBuffer(prepared.fullBuffer);
      const stored = await lookupStoredMediaByHash(sha);
      if (stored === "blocked") {
        return jsonError(UPLOAD_BLOCKED_MEDIA_ES, 403);
      }
      const dup = stored;
      if (dup?.kind === "IMAGE" || dup?.kind === "ANIMATION") {
        return NextResponse.json({
          kind: "IMAGE" as const,
          mediaUrl: dup.mediaUrl,
          thumbnailUrl: dup.thumbnailUrl,
          animatedImage: dup.kind === "ANIMATION",
        });
      }
      const saved = await persistPreparedImagePair(prepared);
      await recordStoredMediaByHash({
        sha256Hex: sha,
        kind: (prepared.animatedImage ? "ANIMATION" : "IMAGE") as StoredMediaKind,
        mediaUrl: saved.mediaUrl,
        thumbnailUrl: saved.thumbnailUrl,
        byteSize: prepared.fullBuffer.length,
        mimeType: prepared.fullContentType,
      });
      return NextResponse.json({
        kind: "IMAGE" as const,
        mediaUrl: saved.mediaUrl,
        thumbnailUrl: saved.thumbnailUrl,
        animatedImage: prepared.animatedImage,
      });
    } catch (e) {
      if (e instanceof ImageDimensionLimitError) {
        return jsonError(uploadImageLimitMessageEs(e.reason), 413);
      }
      return jsonError("No se pudo procesar la imagen", 500);
    }
  }
  if (VIDEO_TYPES.has(mime)) {
    const buf = Buffer.from(await file.arrayBuffer());
    try {
      const outExt = videoContainerOf(mime);
      const stripped = await stripVideoMetadataBuffer(buf, outExt);
      const sha = sha256HexFromBuffer(stripped);
      const stored = await lookupStoredMediaByHash(sha);
      if (stored === "blocked") {
        return jsonError(UPLOAD_BLOCKED_MEDIA_ES, 403);
      }
      const dup = stored;
      if (dup?.kind === "UPLOADED_VIDEO") {
        return NextResponse.json({
          kind: "UPLOADED_VIDEO" as const,
          mediaUrl: dup.mediaUrl,
          thumbnailUrl: await ensureDedupedVideoPosterUrl(sha, dup.thumbnailUrl, stripped, outExt),
        });
      }
      const saved = await savePreparedStrippedVideo(stripped, outExt);
      const thumbnailUrl = await buildStrippedVideoPosterUrl(stripped, outExt);
      await recordStoredMediaByHash({
        sha256Hex: sha,
        kind: "UPLOADED_VIDEO" as StoredMediaKind,
        mediaUrl: saved.mediaUrl,
        thumbnailUrl,
        byteSize: stripped.length,
        mimeType: mime,
      });
      return NextResponse.json({
        kind: "UPLOADED_VIDEO" as const,
        mediaUrl: saved.mediaUrl,
        thumbnailUrl,
      });
    } catch (e) {
      if (e instanceof StripVideoMetadataError) {
        if (e.code === "FFMPEG_MISSING") {
          console.error("[upload] ffmpeg unavailable:", e.message);
          return jsonError(UPLOAD_SERVICE_UNAVAILABLE_ES, 503);
        }
        return jsonError(VIDEO_METADATA_STRIP_FAILED_ES, 415);
      }
      return jsonError("No se pudo guardar el video", 500);
    }
  }
};
