import { z } from "zod";
import { BUILTIN_THEME_PREFERENCES } from "@/lib/theme/themePreference";

export const customThemeIdSchema = z.string().regex(/^[a-z0-9]{1,64}$/, "Tema inválido");

/** Body of `PUT /api/theme/preference`: a builtin mode, or an own custom theme by id. No extra fields. */
export const themePreferenceUpdateSchema = z.union([
  z.object({ mode: z.enum(BUILTIN_THEME_PREFERENCES) }).strict(),
  z.object({ mode: z.literal("custom"), themeId: customThemeIdSchema }).strict(),
]);
