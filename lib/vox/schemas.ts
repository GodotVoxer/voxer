import { z } from "zod";
import {
  VOX_DESCRIPTION_MAX,
  VOX_MEDIA_URL_MAX,
  VOX_POLL_OPTION_MAX,
  VOX_TITLE_MAX,
  VOX_YOUTUBE_URL_MAX,
} from "@/lib/limits";
import { VOX_CATEGORIES_ALL } from "@/lib/vox/categories";

export const voxCategorySchema = z.enum(VOX_CATEGORIES_ALL);

const pollOptionsSchema = z
  .array(
    z
      .string()
      .max(VOX_POLL_OPTION_MAX)
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "Opción vacía").max(VOX_POLL_OPTION_MAX)),
  )
  .min(2)
  .max(5);

export const createVoxSchema = z
  .object({
    title: z.string().min(1).max(VOX_TITLE_MAX),
    description: z.string().min(1).max(VOX_DESCRIPTION_MAX),
    category: voxCategorySchema,
    mediaType: z.enum(["IMAGE", "UPLOADED_VIDEO", "YOUTUBE"]),
    mediaUrl: z.string().min(1).max(VOX_MEDIA_URL_MAX).optional(),
    thumbnailUrl: z.string().min(1).max(VOX_MEDIA_URL_MAX).optional(),
    /** `mediaUrl` is a GIF the server stored as MP4; see `createCommentSchema`. */
    animatedImage: z.boolean().optional(),
    youtubeVideoId: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{11}$/)
      .optional(),
    youtubeUrl: z.string().min(1).max(VOX_YOUTUBE_URL_MAX).optional(),
    threadUniqueIdsEnabled: z.boolean().optional().default(false),
    countryFlagsEnabled: z.boolean().optional().default(false),
    poll: z
      .object({
        options: pollOptionsSchema,
      })
      .optional(),
  })
  .superRefine((val, ctx) => {
    if (val.mediaType === "YOUTUBE") return;
    if (!val.mediaUrl || !val.thumbnailUrl) {
      ctx.addIssue({
        code: "custom",
        message: "mediaUrl y thumbnailUrl son obligatorios para este tipo",
        path: ["mediaUrl"],
      });
    }
  })
  .superRefine((val, ctx) => {
    if (!val.poll) return;
    const lower = val.poll.options.map((o) => o.toLowerCase());
    if (new Set(lower).size !== lower.length) {
      ctx.addIssue({
        code: "custom",
        message: "Las opciones de la encuesta no pueden repetirse",
        path: ["poll", "options"],
      });
    }
  });
