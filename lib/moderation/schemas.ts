import { ReportReason } from "@prisma/client";
import { z } from "zod";
import {
  COMMENT_BODY_MAX,
  REPORT_DETAILS_MAX,
  USERNAME_MAX,
  VOX_DESCRIPTION_MAX,
  VOX_TITLE_MAX,
} from "@/lib/limits";
import { banContentWindowMaxAmountForUnit } from "@/lib/moderation/contentBan";
import { voxCategorySchema } from "@/lib/vox/schemas";

export const createReportSchema = z.object({
  voxId: z.string().min(1),
  commentId: z.string().optional(),
  reason: z.enum(ReportReason),
  details: z.string().max(REPORT_DETAILS_MAX).optional(),
});

export const moderationBanSchema = z.object({
  targetUserId: z.string().min(1),
  reason: z.string().min(1).max(2000),
  unit: z.enum(["MINUTES", "HOURS", "DAYS"]),
  /** 0 means a permanent ban. */
  value: z
    .number()
    .int()
    .min(0)
    .max(365 * 24 * 60),
  /** Also bans the network fingerprint (an HMAC, never the IP) of the user's latest post. */
  blockClientNetwork: z.boolean().optional().default(false),
});

const moderationBanContentRelativeSchema = z
  .object({
    targetUserId: z.string().min(1),
    forever: z.literal(false),
    amount: z.coerce.number().int().positive(),
    unit: z.enum(["MINUTES", "HOURS", "DAYS"]),
  })
  .superRefine((data, ctx) => {
    const max = banContentWindowMaxAmountForUnit(data.unit);
    if (data.amount > max) {
      ctx.addIssue({
        code: "custom",
        message: `La cantidad no puede superar ${max} para la unidad elegida.`,
        path: ["amount"],
      });
    }
  });

export const moderationBanContentSchema = z.union([
  z.object({
    targetUserId: z.string().min(1),
    forever: z.literal(true),
  }),
  moderationBanContentRelativeSchema,
]);

export const moderationCategorySchema = z.object({
  category: voxCategorySchema,
});

export const moderationEditCommentSchema = z
  .object({
    body: z.string().max(COMMENT_BODY_MAX),
    showStaffIdentity: z.boolean(),
    showOpIdentity: z.boolean(),
  })
  .strict();

export const moderationEditVoxSchema = z.object({
  title: z
    .string()
    .max(VOX_TITLE_MAX)
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "El título no puede quedar vacío").max(VOX_TITLE_MAX)),
  description: z
    .string()
    .max(VOX_DESCRIPTION_MAX)
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "La descripción no puede quedar vacía").max(VOX_DESCRIPTION_MAX)),
});

export const moderationRoleSchema = z.object({
  role: z.enum(["USER", "MOD", "ADMIN"]),
});

export const moderationStaffAddByUsernameSchema = z.object({
  username: z.string().trim().min(1).max(USERNAME_MAX),
});

export const moderationAuthorPublicationsQuerySchema = z
  .object({
    voxId: z.string().optional(),
    commentId: z.string().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .superRefine((val, ctx) => {
    const hasV = Boolean(val.voxId?.trim());
    const hasC = Boolean(val.commentId?.trim());
    if (hasV === hasC) {
      ctx.addIssue({
        code: "custom",
        message: "Indicá exactamente voxId o commentId",
        path: ["voxId"],
      });
    }
  });
