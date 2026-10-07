import { countDuration, countNoun } from "@/lib/format/plural";
import { DAY_MS, type DurationUnit } from "@/lib/time";
import { SOFT_DELETE_GRACE_MS } from "@/lib/moderation/constants";

/** What happens to the moderated publication, as a ladder where each step includes the previous one. `block` is ADMIN only. */
export type PublicationFate = "keep" | "delete" | "purge" | "block";

/** The author's other publications deleted along with the ban. */
export type BanContentScope = "none" | "window" | "all";

/** The files of those publications, hidden ones included. `block` is ADMIN only. */
export type BanContentMedia = "keep" | "purge" | "block";

export type AuthorBanDraft = {
  reason: string;
  permanent: boolean;
  /** Raw text, not a number: with `number` an emptied field snapped back to 0. */
  amount: string;
  unit: DurationUnit;
  blockNetwork: boolean;
  contentScope: BanContentScope;
  contentAmount: string;
  contentUnit: DurationUnit;
  contentMedia: BanContentMedia;
  /** Deleting a whole history of files cannot be undone, so it takes an explicit confirmation. */
  contentMediaConfirmed: boolean;
};

export type PublicationModerationPlan = {
  kind: "vox" | "comment";
  fate: PublicationFate;
  /** `null` means the author is not banned. */
  ban: AuthorBanDraft | null;
};

export const DEFAULT_AUTHOR_BAN_DRAFT: AuthorBanDraft = {
  reason: "",
  permanent: false,
  amount: "3",
  unit: "DAYS",
  blockNetwork: false,
  contentScope: "none",
  contentAmount: "10",
  contentUnit: "MINUTES",
  contentMedia: "keep",
  contentMediaConfirmed: false,
};

/** Everything at once, for content that must never come back (gore, child abuse). */
export const illegalContentPreset = (
  draft: AuthorBanDraft,
  canBlock: boolean,
): { fate: PublicationFate; ban: AuthorBanDraft } => ({
  fate: canBlock ? "block" : "purge",
  ban: {
    ...draft,
    reason: draft.reason.trim() ? draft.reason : "Contenido ilegal.",
    permanent: true,
    blockNetwork: true,
    contentScope: "all",
    contentMedia: canBlock ? "block" : "purge",
    contentMediaConfirmed: false,
  },
});

const bulkMediaPending = (ban: AuthorBanDraft | null): boolean =>
  ban !== null && ban.contentScope !== "none" && ban.contentMedia !== "keep";

export type BanContentWindow =
  | { forever: true }
  | { forever: false; amount: number; unit: DurationUnit };

/** `null` when nothing else is deleted or the window is not a valid number yet. */
export const banContentWindow = (
  ban: Pick<AuthorBanDraft, "contentScope" | "contentAmount" | "contentUnit">,
): BanContentWindow | null => {
  if (ban.contentScope === "none") return null;
  if (ban.contentScope === "all") return { forever: true };
  const amount = parsePositiveInt(ban.contentAmount);
  return amount === null ? null : { forever: false, amount, unit: ban.contentUnit };
};

export const fateDeletesPublication = (fate: PublicationFate): boolean => fate !== "keep";
export const fatePurgesMedia = (fate: PublicationFate): boolean =>
  fate === "purge" || fate === "block";

export const parsePositiveInt = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : null;
};

/** `null` until the amount is valid: the summary must not invent a duration. */
const durationLabel = (raw: string, unit: DurationUnit): string | null => {
  const n = parsePositiveInt(raw);
  if (n === null) return null;
  return countDuration(n, unit);
};

const undoWindowDays = Math.round(SOFT_DELETE_GRACE_MS / DAY_MS);

/** `danger` marks what cannot be undone, so the summary highlights it. */
export type ModerationSummaryLine = { text: string; tone: "default" | "danger" };

const fateLine = (plan: PublicationModerationPlan): ModerationSummaryLine | null => {
  const noun = plan.kind === "vox" ? "este vox" : "este comentario";
  switch (plan.fate) {
    case "keep":
      return null;
    case "delete":
      return {
        text: `Se elimina ${noun} (reversible por ${undoWindowDays} días desde el historial).`,
        tone: "default",
      };
    case "purge":
      return {
        text: `Se elimina ${noun} y se borra su multimedia. El archivo no se puede recuperar.`,
        tone: "danger",
      };
    case "block":
      return {
        text: `Se elimina ${noun}, se borra su multimedia y el archivo queda bloqueado: nadie va a poder volver a subirlo. No se puede deshacer.`,
        tone: "danger",
      };
  }
};

const banLines = (ban: AuthorBanDraft): ModerationSummaryLine[] => {
  const banLabel = durationLabel(ban.amount, ban.unit);
  const lines: ModerationSummaryLine[] = [
    {
      text: ban.permanent
        ? "El autor queda baneado para siempre."
        : banLabel
          ? `El autor queda baneado ${banLabel}.`
          : "Falta completar la duración del ban.",
      tone: "default",
    },
  ];
  if (ban.blockNetwork) {
    lines.push({ text: "También se banea la red desde la que se conectó.", tone: "default" });
  }
  if (ban.contentScope === "all") {
    lines.push({
      text: `Se borran todos sus vox y comentarios (reversible por ${undoWindowDays} días).`,
      tone: "default",
    });
  } else if (ban.contentScope === "window") {
    const windowLabel = durationLabel(ban.contentAmount, ban.contentUnit);
    lines.push({
      text: windowLabel
        ? `Se borran sus vox y comentarios de los últimos ${windowLabel} (reversible por ${undoWindowDays} días).`
        : "Falta completar la ventana de publicaciones a borrar.",
      tone: "default",
    });
  }
  if (bulkMediaPending(ban)) {
    lines.push({
      text:
        ban.contentMedia === "block"
          ? "También se borran y se bloquean los archivos de esas publicaciones, incluidas las que ya estaban ocultas: nadie va a poder volver a subirlos. No se puede deshacer."
          : "También se borran los archivos de esas publicaciones, incluidas las que ya estaban ocultas. No se pueden recuperar.",
      tone: "danger",
    });
  }
  return lines;
};

/** What the dialog is about to run, in order and in plain Spanish: up to four separate calls. */
export const publicationModerationSummary = (
  plan: PublicationModerationPlan,
): ModerationSummaryLine[] => {
  const lines: ModerationSummaryLine[] = [];
  const fate = fateLine(plan);
  if (fate) lines.push(fate);
  if (plan.ban) lines.push(...banLines(plan.ban));
  if (lines.length === 0) {
    lines.push({ text: "Todavía no elegiste ninguna acción.", tone: "default" });
  }
  return lines;
};

/** First problem preventing confirmation, or `null` when the plan can run. */
export const publicationModerationProblem = (plan: PublicationModerationPlan): string | null => {
  if (plan.fate === "keep" && !plan.ban) {
    return "Elegí qué hacer con la publicación o baneá al autor.";
  }
  if (!plan.ban) return null;
  if (plan.ban.reason.trim().length < 1) return "Completá el motivo del ban.";
  if (!plan.ban.permanent && parsePositiveInt(plan.ban.amount) === null) {
    return "La duración del ban debe ser un número entero mayor a cero.";
  }
  if (plan.ban.contentScope === "window" && parsePositiveInt(plan.ban.contentAmount) === null) {
    return "La ventana de publicaciones a borrar debe ser un número entero mayor a cero.";
  }
  if (bulkMediaPending(plan.ban) && !plan.ban.contentMediaConfirmed) {
    return "Confirmá que revisaste al autor: borrar todos sus archivos no se puede deshacer.";
  }
  return null;
};

export const publicationModerationConfirmLabel = (plan: PublicationModerationPlan): string => {
  const deletes = fateDeletesPublication(plan.fate);
  if (deletes && plan.ban) return "Eliminar y banear";
  if (plan.ban) return "Banear autor";
  if (deletes) return "Eliminar";
  return "Confirmar";
};

/** What the chosen window reaches, as the dialog shows it before confirming. */
export const authorContentCountsLabel = (counts: {
  voxCount: number;
  commentCount: number;
  mediaCount: number;
}): string => {
  const visible =
    counts.voxCount + counts.commentCount === 0
      ? "No tiene publicaciones visibles en ese período."
      : `Alcanza ${countNoun(counts.voxCount, "vox", "vox")} y ${countNoun(counts.commentCount, "comentario", "comentarios")}.`;
  if (counts.mediaCount === 0) return `${visible} Ninguna tiene archivos.`;
  const media = countNoun(counts.mediaCount, "publicación tiene", "publicaciones tienen");
  return `${visible} ${media} archivos, contando las ya ocultas.`;
};
