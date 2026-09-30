import { z } from "zod";

export const notificationsMarkReadVoxSchema = z.object({
  voxId: z.string().min(1),
});
