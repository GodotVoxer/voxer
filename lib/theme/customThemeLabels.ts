import type { CustomThemeOverrideKey } from "@/lib/theme/customTheme";
import { THEME_RAMP_FAMILIES, type ThemeTokenKey } from "@/lib/theme/themeTokens";

export const CUSTOM_THEME_OVERRIDE_LABELS: Record<CustomThemeOverrideKey, string> = {
  surface: "Fondo de página",
  "surface-sunken": "Encabezado y campos",
  "surface-raised": "Paneles y diálogos",
  "surface-muted": "Superficie apagada",
  "surface-elevated": "Botones y hover",
  "surface-strong": "Bordes marcados",
  "surface-vox-detail": "Fondo del vox",
  "surface-toolbar": "Barra de comentarios",
  "media-placeholder": "Fondo de miniaturas",
  "comment-pin": "Comentario fijado (OP)",
  "comment-pin-soft": "Halo del comentario fijado",
  shade: "Sombras y velos",
  "on-solid": "Texto sobre botones",
  fg: "Texto principal",
  "fg-bright": "Texto destacado",
  "fg-soft": "Texto suave",
  "fg-secondary": "Texto secundario",
  "fg-muted": "Texto atenuado",
  "fg-subtle": "Metadatos",
  "fg-faint": "Separadores",
  greentext: "Greentext",
  "header-scrim": "Velo del encabezado",
  "header-fg": "Texto del encabezado",
  "header-text-bg": "Fondo de usuario del encabezado",
  "header-control": "Botones del encabezado",
  "header-control-border": "Borde de botones del encabezado",
  "sidebar-bg": "Fondo de la barra lateral",
  "sidebar-fg": "Texto de la barra lateral",
  "sidebar-muted": "Texto atenuado de la barra lateral",
  "sidebar-accent": "Selección de la barra lateral",
  "sidebar-accent-fg": "Texto sobre selección lateral",
  "on-media": "Texto sobre imágenes y etiquetas",
  "media-scrim": "Velo sobre imágenes",
  "media-chip": "Etiqueta de video",
  "pill-category": "Etiqueta de categoría",
  "pill-replies": "Etiqueta de comentarios",
  "pill-poll": "Etiqueta de encuesta",
  "pill-pinned": "Etiqueta de pineado",
  "pill-new": "Etiqueta de nuevo",
  "pill-youtube": "Etiqueta de YouTube",
  "media-favorite": "Favorito",
  "media-danger": "Denunciar y moderar",
  "media-pin": "Pinear (staff)",
  "media-history": "Historial (staff)",
  "avatar-blue": "Avatar azul",
  "avatar-green": "Avatar verde",
  "avatar-red": "Avatar rojo",
  "avatar-yellow": "Avatar amarillo",
  "avatar-pink": "Avatar rosa",
  "avatar-brown": "Avatar marrón",
  "avatar-white": "Avatar blanco",
  "avatar-black": "Avatar negro",
  "avatar-gray": "Avatar por defecto",
  "staff-flash-a": "Avatar staff (destello 1)",
  "staff-flash-b": "Avatar staff (destello 2)",
  "staff-crown": "Corona de admin",
  brand: "Acento (botones, links)",
  danger: "Peligro / errores",
  warning: "Aviso / pineados",
  caution: "Precaución",
  success: "Éxito",
  highlight: "Favoritos",
  category: "Categorías",
  special: "Especial",
  vivid: "Decorativo",
};

export type CustomThemeEditorGroup = {
  id: string;
  title: string;
  keys: readonly CustomThemeOverrideKey[];
};

/** Sections of the Advanced mode; every editable key appears in exactly one (checked by the test). */
export const CUSTOM_THEME_EDITOR_GROUPS: readonly CustomThemeEditorGroup[] = [
  {
    id: "surfaces",
    title: "Superficies",
    keys: [
      "surface",
      "surface-sunken",
      "surface-raised",
      "surface-muted",
      "surface-elevated",
      "surface-strong",
      "surface-vox-detail",
      "surface-toolbar",
      "media-placeholder",
      "shade",
    ],
  },
  {
    id: "text",
    title: "Texto",
    keys: [
      "fg",
      "fg-bright",
      "fg-soft",
      "fg-secondary",
      "fg-muted",
      "fg-subtle",
      "fg-faint",
      "on-solid",
      "greentext",
    ],
  },
  {
    id: "header",
    title: "Encabezado",
    keys: [
      "header-scrim",
      "header-fg",
      "header-text-bg",
      "header-control",
      "header-control-border",
    ],
  },
  {
    id: "sidebar",
    title: "Barra lateral",
    keys: ["sidebar-bg", "sidebar-fg", "sidebar-muted", "sidebar-accent", "sidebar-accent-fg"],
  },
  { id: "accents", title: "Acentos y estados", keys: THEME_RAMP_FAMILIES },
  { id: "media", title: "Sobre imágenes", keys: ["on-media", "media-scrim", "media-chip"] },
  {
    id: "pills",
    title: "Etiquetas de las tarjetas",
    keys: ["pill-category", "pill-replies", "pill-poll", "pill-pinned", "pill-new", "pill-youtube"],
  },
  {
    id: "pinned-comments",
    title: "Comentarios fijados",
    keys: ["comment-pin", "comment-pin-soft"],
  },
  {
    id: "card-actions",
    title: "Acciones sobre las tarjetas",
    keys: ["media-favorite", "media-danger", "media-pin", "media-history"],
  },
  {
    id: "avatars",
    title: "Avatares",
    keys: [
      "avatar-blue",
      "avatar-green",
      "avatar-red",
      "avatar-yellow",
      "avatar-pink",
      "avatar-brown",
      "avatar-white",
      "avatar-black",
      "avatar-gray",
      "staff-flash-a",
      "staff-flash-b",
      "staff-crown",
    ],
  },
];

/** Readable names of the tokens that appear in contrast warnings. */
export const contrastTokenLabel = (key: ThemeTokenKey): string => {
  if (key in CUSTOM_THEME_OVERRIDE_LABELS) {
    return CUSTOM_THEME_OVERRIDE_LABELS[key as CustomThemeOverrideKey];
  }
  const family = key.replace(/-\d+$/, "");
  return family in CUSTOM_THEME_OVERRIDE_LABELS
    ? CUSTOM_THEME_OVERRIDE_LABELS[family as CustomThemeOverrideKey]
    : key;
};
