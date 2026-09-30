import { NextResponse } from "next/server";
import { z } from "zod";
import type { StoredMediaKind } from "@prisma/client";
import { invalidRequest, jsonError, readJsonBody } from "@/server/http/apiErrors";
import {
  ImageDimensionLimitError,
  type SavedUpload,
  discardSavedR2Upload,
  persistPreparedImagePair,
  prepareImageBuffers,
} from "@/server/media/imageProcess";
import { blobPathnameFromFinalizeUrl } from "@/server/upload/blobFinalizeUrl";
import { UPLOAD_MAX_IMAGE_BYTES, uploadImageLimitMessageEs } from "@/lib/media/uploadLimits";
import { sha256HexFromBuffer } from "@/server/media/sha256Hex";
import { lookupStoredMediaByHash, recordStoredMediaByHash } from "@/server/media/storedMediaByHash";
import { UPLOAD_BLOCKED_MEDIA_ES } from "@/lib/media/uploadBlockedMedia";
import { type R2ObjectReadResult, readR2ObjectBuffer } from "@/server/storage/r2Storage";
import {
  completeBlobUpload,
  discardBlobUpload,
  verifyBlobFinalizeAuthorization,
} from "@/server/upload/blobPendingFinalize";
import { guardUploadRequest } from "@/server/upload/guard";

export const runtime = "nodejs";

const bodySchema = z.object({
  url: z.string().url(),
});

const extFromPathname = (pathname: string): string => pathname.slice(pathname.lastIndexOf(".") + 1);

export const POST = async (req: Request) => {
  const guard = await guardUploadRequest(req, {
    rateLimit: "upload-blob-finalize",
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
  const pathname = blobPathnameFromFinalizeUrl(url, "image");
  if (!pathname) {
    return jsonError("URL de imagen no permitida", 400);
  }
  const authorized = await verifyBlobFinalizeAuthorization(pathname, userId);
  if (!authorized) {
    return jsonError("No tenés permiso para finalizar esta subida.", 403);
  }
  let read: R2ObjectReadResult;
  try {
    read = await readR2ObjectBuffer(pathname, UPLOAD_MAX_IMAGE_BYTES);
  } catch {
    await discardBlobUpload(pathname, userId);
    return jsonError("No se pudo leer la imagen subida", 502);
  }
  if (!read.ok) {
    await discardBlobUpload(pathname, userId);
    return read.reason === "too_large"
      ? jsonError("La imagen es demasiado grande", 413)
      : jsonError("No se pudo leer la imagen subida", 502);
  }
  const buf = read.body;
  const sha = sha256HexFromBuffer(buf);
  const stored = await lookupStoredMediaByHash(sha);
  if (stored === "blocked") {
    await discardBlobUpload(pathname, userId);
    return jsonError(UPLOAD_BLOCKED_MEDIA_ES, 403);
  }
  const dup = stored;
  if (dup?.kind === "IMAGE" || dup?.kind === "ANIMATION") {
    await discardBlobUpload(pathname, userId);
    return NextResponse.json({
      kind: "IMAGE" as const,
      mediaUrl: dup.mediaUrl,
      thumbnailUrl: dup.thumbnailUrl,
      animatedImage: dup.kind === "ANIMATION",
    });
  }
  let saved: SavedUpload | null = null;
  let animatedImage = false;
  try {
    const prepared = await prepareImageBuffers(buf, extFromPathname(pathname));
    animatedImage = prepared.animatedImage;
    saved = await persistPreparedImagePair(prepared);
    await recordStoredMediaByHash({
      sha256Hex: sha,
      kind: (prepared.animatedImage ? "ANIMATION" : "IMAGE") as StoredMediaKind,
      mediaUrl: saved.mediaUrl,
      thumbnailUrl: saved.thumbnailUrl,
      byteSize: prepared.fullBuffer.length,
      mimeType: prepared.fullContentType,
    });
  } catch (e) {
    if (saved) await discardSavedR2Upload(saved);
    await discardBlobUpload(pathname, userId);
    if (e instanceof ImageDimensionLimitError) {
      return jsonError(uploadImageLimitMessageEs(e.reason), 413);
    }
    return jsonError("No se pudo procesar la imagen", 500);
  }
  await completeBlobUpload(pathname, userId);
  return NextResponse.json({
    kind: "IMAGE" as const,
    mediaUrl: saved.mediaUrl,
    thumbnailUrl: saved.thumbnailUrl,
    animatedImage,
  });
};
