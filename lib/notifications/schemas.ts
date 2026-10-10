import { z } from "zod";

export const notificationsMarkReadVoxSchema = z.object({
  voxId: z.string().min(1),
  /**
   * `createdAt` of the newest comment the reader has on screen, `null` when there is none: only the
   * notifications up to it are marked. Omitted, every notification of the vox is marked.
   */
  seenThrough: z.iso.datetime().nullable().optional(),
});
