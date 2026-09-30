import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidRequest, jsonError, readJsonBody } from "@/server/http/apiErrors";
import { reserveMediaUploadSlot, type MediaUploadIntent } from "@/server/upload/userMediaSlot";
import { UPLOAD_MAX_IMAGE_BYTES, UPLOAD_MAX_VIDEO_BYTES } from "@/lib/media/uploadLimits";
import { lookupStoredMediaByHash } from "@/server/media/storedMediaByHash";
import { UPLOAD_BLOCKED_MEDIA_ES } from "@/lib/media/uploadBlockedMedia";
import { r2PublicUrlForKey } from "@/lib/media/publicStorage";
import { presignedPutUploadsObject } from "@/server/storage/r2Storage";
import { registerBlobFinalizeSlot } from "@/server/upload/blobPendingFinalize";
import { directUploadKey } from "@/server/upload/blobFinalizeUrl";
import { guardUploadRequest } from "@/server/upload/guard";
import { videoContainerOf, videoMimeOf } from "@/lib/media/videoFormat";

export const runtime = "nodejs";

const IMAGE_CT = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const videoBody = z.object({
  kind: z.literal("video"),
  contentType: z.string().optional(),
  size: z.number().int().positive(),
  intent: z.enum(["vox", "comment"]).optional(),
});
const imageBody = z.object({
  kind: z.literal("image"),
  contentType: z.string(),
  size: z.number().int().positive(),
  intent: z.enum(["vox", "comment"]).optional(),
  contentSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .transform((s) => s.toLowerCase())
    .optional(),
});
const bodySchema = z.discriminatedUnion("kind", [videoBody, imageBody]);

const imageMimeToExt = (mime: string): "jpg" | "png" | "webp" | "gif" | null => {
  const m = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (m === "image/jpeg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "image/gif") return "gif";
  return null;
};

export const POST = async (req: Request) => {
  const guard = await guardUploadRequest(req, {
    rateLimit: "upload-blob-token",
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
  const intentField = parsed.data.intent;
  const intent: MediaUploadIntent = intentField === "comment" ? "comment" : "vox";

  if (parsed.data.kind === "image" && parsed.data.contentSha256) {
    // Early rejection saves the PUT; the hash is client-declared, so finalize checks the real bytes.
    const stored = await lookupStoredMediaByHash(parsed.data.contentSha256);
    if (stored === "blocked") {
      return jsonError(UPLOAD_BLOCKED_MEDIA_ES, 403);
    }
    const dup = stored;
    if (dup?.kind === "IMAGE" || dup?.kind === "ANIMATION") {
      return NextResponse.json({
        deduped: true as const,
        kind: "IMAGE" as const,
        mediaUrl: dup.mediaUrl,
        thumbnailUrl: dup.thumbnailUrl,
        animatedImage: dup.kind === "ANIMATION",
      });
    }
  }

  const slot = await reserveMediaUploadSlot(userId, intent);
  if (!slot.ok) {
    return jsonError(slot.message, 429);
  }
  const id = crypto.randomUUID();

  if (parsed.data.kind === "video") {
    const { size, contentType: rawCt } = parsed.data;
    if (size > UPLOAD_MAX_VIDEO_BYTES) {
      return jsonError("El video es demasiado grande", 413);
    }
    const ct = (rawCt ?? "").toLowerCase();
    const ext = videoContainerOf(ct);
    const contentType = videoMimeOf(ext);
    const pathname = directUploadKey(id, ext);
    try {
      const uploadUrl = await presignedPutUploadsObject({
        key: pathname,
        contentType,
        contentLength: size,
      });
      const publicUrl = r2PublicUrlForKey(pathname);
      await registerBlobFinalizeSlot(pathname, userId);
      return NextResponse.json({ uploadUrl, publicUrl, pathname });
    } catch {
      return jsonError("No se pudo preparar la subida", 500);
    }
  }

  const { size, contentType: rawMime } = parsed.data;
  if (size > UPLOAD_MAX_IMAGE_BYTES) {
    return jsonError("La imagen es demasiado grande", 413);
  }
  const mime = rawMime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!IMAGE_CT.has(mime)) {
    return jsonError("Tipo de imagen no permitido", 415);
  }
  const ext = imageMimeToExt(mime);
  if (!ext) {
    return jsonError("Tipo de imagen no permitido", 415);
  }
  const pathname = directUploadKey(id, ext);
  try {
    const uploadUrl = await presignedPutUploadsObject({
      key: pathname,
      contentType: mime,
      contentLength: size,
    });
    const publicUrl = r2PublicUrlForKey(pathname);
    await registerBlobFinalizeSlot(pathname, userId);
    return NextResponse.json({ uploadUrl, publicUrl, pathname });
  } catch {
    return jsonError("No se pudo preparar la subida", 500);
  }
};
