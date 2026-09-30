import type { VoxCategory } from "@/lib/vox/categories";
import { VOX_CATEGORIES_ALL } from "@/lib/vox/categories";
/** Unique uppercase short code used in URLs (e.g. /GEN). */
export const CATEGORY_CODE_BY_NAME: Record<VoxCategory, string> = {
  General: "GEN",
  Voxer: "VXR",
  Random: "RND",
  Anecdotas: "ANE",
  Consejos: "CSJ",
  Fitness: "FIT",
  Preguntas: "PRE",
  Salud: "SLD",
  Mujeres: "MUJ",
  Gozadores: "GOZ",
  Arte: "ART",
  Ciencia: "CIE",
  Religion: "REL",
  Historia: "HIS",
  Literatura: "LIT",
  "Lugares e idiomas": "LDI",
  Moda: "MOD",
  Comida: "COM",
  Musica: "MUS",
  "Anime/Manga": "ANM",
  "Cine y TV": "CTV",
  Deportes: "DEP",
  Futbol: "FUT",
  Humor: "HUM",
  Videojuegos: "VGJ",
  Redes: "RED",
  Normies: "NRM",
  Omniverso3p: "O3P",
  Tecnologia: "TEC",
  Programacion: "PGM",
  "Inteligencia Artificial": "IAI",
  Economia: "ECO",
  Guerra: "GUE",
  Politica: "POL",
  Noticias: "NOT",
  Porno: "POR",
  Gay: "GAY",
  Hentai: "HEN",
  Fetiches: "FET",
  Conspiraciones: "CSP",
  Paranormal: "PAR",
  Videos: "VID",
  Avatarfags: "AVF",
  Animales: "ANI",
};
const CODE_TO_CATEGORY: Record<string, VoxCategory> = Object.fromEntries(
  Object.entries(CATEGORY_CODE_BY_NAME).map(([name, code]) => [code, name as VoxCategory]),
) as Record<string, VoxCategory>;
export type CategoryGroup = {
  id: string;
  label: string;
  categories: readonly VoxCategory[];
};
/** Sidebar groups; each category appears exactly once. */
export const CATEGORY_GROUPS: readonly CategoryGroup[] = [
  {
    id: "general",
    label: "General y comunidad",
    categories: ["General", "Voxer", "Random", "Anecdotas", "Avatarfags"],
  },
  {
    id: "conversacion",
    label: "Conversación y bienestar",
    categories: ["Consejos", "Fitness", "Preguntas", "Salud"],
  },
  {
    id: "cultura",
    label: "Cultura",
    categories: [
      "Arte",
      "Ciencia",
      "Religion",
      "Historia",
      "Literatura",
      "Lugares e idiomas",
      "Moda",
      "Comida",
    ],
  },
  {
    id: "entretenimiento",
    label: "Entretenimiento",
    categories: [
      "Musica",
      "Anime/Manga",
      "Cine y TV",
      "Deportes",
      "Futbol",
      "Humor",
      "Videojuegos",
      "Videos",
      "Mujeres",
      "Animales",
    ],
  },
  {
    id: "internet",
    label: "Internet y tecnología",
    categories: [
      "Redes",
      "Normies",
      "Tecnologia",
      "Programacion",
      "Inteligencia Artificial",
      "Omniverso3p",
      "Gozadores",
    ],
  },
  {
    id: "actualidad",
    label: "Actualidad",
    categories: ["Economia", "Guerra", "Politica", "Noticias"],
  },
  {
    id: "misterio",
    label: "Misterio",
    categories: ["Conspiraciones", "Paranormal"],
  },
  {
    id: "nsfw",
    label: "NSFW",
    categories: ["Porno", "Gay", "Hentai", "Fetiches"],
  },
] as const;
const assertCoverage = () => {
  const seen = new Set<VoxCategory>();
  for (const g of CATEGORY_GROUPS) {
    for (const c of g.categories) {
      if (seen.has(c)) throw new Error(`Category listed in several groups: ${c}`);
      seen.add(c);
    }
  }
  if (seen.size !== VOX_CATEGORIES_ALL.length) {
    const missing = VOX_CATEGORIES_ALL.filter((c) => !seen.has(c));
    throw new Error(`Categories missing from groups: ${missing.join(", ")}`);
  }
};
assertCoverage();
export const getCategoryCode = (name: string): string | null => {
  const code = CATEGORY_CODE_BY_NAME[name as VoxCategory];
  return code ?? null;
};
export const getCategoryFromCode = (code: string): VoxCategory | null => {
  const upper = code.trim().toUpperCase();
  return CODE_TO_CATEGORY[upper] ?? null;
};
export const getCategoryDisplayName = (category: string): string => {
  const trimmed = category.trim();
  return getCategoryFromCode(trimmed) ?? trimmed;
};
export const ALL_CATEGORY_CODES = [...new Set(Object.values(CATEGORY_CODE_BY_NAME))].sort();
