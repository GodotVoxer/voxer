import { z } from "zod";

const bodySchema = z.object({ block: z.boolean().optional() }).strict();

/**
 * The body is optional: a plain purge is still an empty POST, so a missing body means `false` and
 * only malformed JSON or extra fields are errors.
 */
export const readPurgeMediaBlockFlag = async (req: Request): Promise<boolean | null> => {
  let raw: unknown;
  try {
    const text = await req.text();
    if (!text.trim()) return false;
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data.block === true;
};
