import { z } from "zod";
import {
  COMMENT_BODY_MAX,
  COMMENT_BODY_MAX_LINES,
  COMMENT_LIST_PAGE_MAX,
  COMMENT_MEDIA_URL_MAX,
  VOX_YOUTUBE_URL_MAX,
} from "@/lib/limits";
import { commentBodyLineCount } from "@/lib/comments/normalizeCommentBody";

export const createCommentSchema = z
  .object({
    body: z.string().max(COMMENT_BODY_MAX).default(""),
    imageUrl: z.string().min(1).max(COMMENT_MEDIA_URL_MAX).optional(),
    videoUrl: z.string().min(1).max(COMMENT_MEDIA_URL_MAX).optional(),
    videoPosterUrl: z.string().min(1).max(COMMENT_MEDIA_URL_MAX).optional(),
    /**
     * `videoUrl` is a GIF the server stored as MP4, played muted and looped. It is a presentation
     * hint, not a permission: a client that lies only gets its own video shown as a loop.
     */
    animatedImage: z.boolean().optional(),
    youtubeUrl: z.string().min(1).max(VOX_YOUTUBE_URL_MAX).optional(),
    /** Honoured only when the author is staff. */
    showStaffIdentity: z.boolean().optional(),
    /** Poll option shown on the comment; the server checks it is the author's own vote. */
    pollDisclosureOptionId: z.string().min(1).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (commentBodyLineCount(val.body) > COMMENT_BODY_MAX_LINES) {
      ctx.addIssue({
        code: "custom",
        message: `El comentario tiene demasiados saltos de línea (máximo ${COMMENT_BODY_MAX_LINES} líneas)`,
        path: ["body"],
      });
    }
    const img = val.imageUrl?.trim();
    const vid = val.videoUrl?.trim();
    const yt = val.youtubeUrl?.trim();
    const mediaSlots = (img ? 1 : 0) + (vid ? 1 : 0) + (yt ? 1 : 0);
    if (mediaSlots > 1) {
      ctx.addIssue({
        code: "custom",
        message: "Solo se admite imagen, video subido o enlace de YouTube, no varios a la vez",
        path: ["imageUrl"],
      });
    }
    if (val.animatedImage && !vid) {
      ctx.addIssue({
        code: "custom",
        message: "La marca de animación solo aplica a un video subido",
        path: ["animatedImage"],
      });
    }
    // A poll vote is content on its own: a comment may carry nothing else.
    const hasPollDisclosure = Boolean(val.pollDisclosureOptionId?.trim());
    if (!val.body.trim() && mediaSlots === 0 && !hasPollDisclosure) {
      ctx.addIssue({
        code: "custom",
        message: "Escribí un mensaje, adjuntá multimedia válida o mostrá tu voto",
        path: ["body"],
      });
    }
    const poster = val.videoPosterUrl?.trim();
    if (poster) {
      if (mediaSlots === 0) {
        ctx.addIssue({
          code: "custom",
          message: "La miniatura de video solo aplica si adjuntás un video",
          path: ["videoPosterUrl"],
        });
      }
      if (img || yt) {
        ctx.addIssue({
          code: "custom",
          message: "No se puede combinar miniatura de video con imagen o YouTube",
          path: ["videoPosterUrl"],
        });
      }
    }
  });

export const commentsQuerySchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(COMMENT_LIST_PAGE_MAX).optional(),
    afterCreatedAt: z.iso.datetime().optional(),
    afterId: z.string().min(1).max(64).optional(),
  })
  .superRefine((val, ctx) => {
    if (Boolean(val.afterCreatedAt) !== Boolean(val.afterId)) {
      ctx.addIssue({
        code: "custom",
        message: "afterCreatedAt y afterId van juntos",
        path: ["afterId"],
      });
    }
    if (val.afterCreatedAt && val.cursor) {
      ctx.addIssue({
        code: "custom",
        message: "No se puede combinar cursor con afterCreatedAt",
        path: ["cursor"],
      });
    }
  });
