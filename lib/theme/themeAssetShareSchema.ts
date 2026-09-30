import { z } from "zod";
import { THEME_ASSET_SHARE_ID_RE } from "@/lib/theme/customTheme";

export const themeAssetShareImportSchema = z
  .object({ shareId: z.string().regex(THEME_ASSET_SHARE_ID_RE) })
  .strict();
