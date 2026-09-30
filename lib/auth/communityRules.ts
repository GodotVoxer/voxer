/** Bump when the rules text changes: accounts on an older version confirm again before posting. */
export const COMMUNITY_RULES_VERSION = 1;

export type CommunityRuleId = "categories" | "spam" | "law" | "gore";

export type CommunityRule = {
  id: CommunityRuleId;
  title: string;
  detail: string;
};

export const COMMUNITY_RULES: readonly CommunityRule[] = [
  {
    id: "categories",
    title: "Respetá las categorías",
    detail: "Publicá cada vox en la categoría que le corresponde.",
  },
  {
    id: "spam",
    title: "Nada de spam ni flood",
    detail: "No repitas publicaciones ni llenes los hilos de mensajes.",
  },
  {
    id: "law",
    title: "Respetá la ley argentina",
    detail: "No publiques nada que sea ilegal en Argentina.",
  },
  {
    id: "gore",
    title: "No se permite el gore",
    detail: "Nada de sangre, mutilaciones ni violencia explícita.",
  },
];

export const RULES_NOT_ACCEPTED_CODE = "RULES_NOT_ACCEPTED";

export const RULES_NOT_ACCEPTED_MESSAGE_ES = "Tenés que aceptar las reglas de Voxer para publicar.";

export const hasAcceptedCurrentRules = (acceptedVersion: number | null | undefined): boolean =>
  acceptedVersion != null && acceptedVersion >= COMMUNITY_RULES_VERSION;
