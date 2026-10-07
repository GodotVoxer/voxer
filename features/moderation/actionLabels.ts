import type { ModerationActionRow } from "@/features/moderation/api";
import { LEGACY_BAN_CONTENT_LABEL_KEY } from "@/lib/moderation/contentBan";

export const moderationActionSupportsUndo = (actionType: string): boolean =>
  new Set([
    "DELETE_VOX",
    "DELETE_COMMENT",
    "RECATEGORIZE_VOX",
    "EDIT_VOX",
    "EDIT_COMMENT",
    "BAN_USER",
    "BULK_SOFT_DELETE_USER_CONTENT",
  ]).has(actionType);

export const moderationActionLabelEs = (actionType: string): string => {
  const labels: Record<string, string> = {
    BAN_USER: "Banear usuario",
    DELETE_VOX: "Eliminar vox",
    DELETE_COMMENT: "Eliminar comentario",
    RECATEGORIZE_VOX: "Recategorizar vox",
    EDIT_VOX: "Editar vox propio",
    EDIT_COMMENT: "Editar comentario propio",
    BULK_SOFT_DELETE_USER_CONTENT: "Borrar publicaciones del usuario",
    PIN_VOX: "Pinear vox",
    UNPIN_VOX: "Despinear vox",
  };
  return labels[actionType] ?? actionType;
};

const payloadRecord = (row: ModerationActionRow): Record<string, unknown> | null => {
  const payload = row.payload;
  if (!payload || typeof payload !== "object") return null;
  return payload as Record<string, unknown>;
};

export const moderationActionPayloadSummary = (row: ModerationActionRow): string => {
  const data = payloadRecord(row);
  if (!data) return "—";

  if (row.actionType === "BAN_USER") {
    const base = String(data.reason ?? "—");
    if (data.clientNetworkBlock === true) {
      return `${base} · Restricción por huella de red`;
    }
    return base;
  }
  if (row.actionType === "DELETE_VOX") return String(data.title ?? data.voxId ?? "—");
  if (row.actionType === "PIN_VOX" || row.actionType === "UNPIN_VOX") {
    return String(data.title ?? data.voxId ?? "—");
  }
  if (row.actionType === "DELETE_COMMENT") return String(data.publicTag ?? data.commentId ?? "—");
  if (row.actionType === "RECATEGORIZE_VOX") {
    const cats = `${String(data.previousCategory ?? "?")} → ${String(data.newCategory ?? "?")}`;
    const title = typeof data.title === "string" ? data.title.trim() : "";
    return title ? `«${title}» · ${cats}` : cats;
  }
  if (row.actionType === "EDIT_VOX") {
    const previous = typeof data.previousTitle === "string" ? data.previousTitle.trim() : "";
    const current = typeof data.title === "string" ? data.title.trim() : "";
    if (previous && current && previous !== current) return `«${previous}» → «${current}»`;
    return current ? `«${current}»` : String(data.voxId ?? "—");
  }
  if (row.actionType === "EDIT_COMMENT") return String(data.publicTag ?? data.commentId ?? "—");
  if (row.actionType === "BULK_SOFT_DELETE_USER_CONTENT") {
    const voxCount = Array.isArray(data.voxIds) ? data.voxIds.length : 0;
    const commentCount = Array.isArray(data.commentIds) ? data.commentIds.length : 0;
    const windowLabel =
      typeof data.banContentLabel === "string"
        ? data.banContentLabel
        : typeof data[LEGACY_BAN_CONTENT_LABEL_KEY] === "string"
          ? String(data[LEGACY_BAN_CONTENT_LABEL_KEY])
          : typeof data.window === "string"
            ? data.window
            : "—";
    const media =
      data.media === "block"
        ? ", archivos borrados y bloqueados"
        : data.media === "purge"
          ? ", archivos borrados"
          : "";
    return `vox: ${voxCount}, comentarios: ${commentCount}, ${windowLabel}${media}`;
  }
  return "—";
};

export const moderationActionPreviewTitle = (row: ModerationActionRow): string => {
  const data = payloadRecord(row);
  if (row.actionType === "RECATEGORIZE_VOX") {
    return `Vox recategorizado: ${String(data?.previousCategory ?? "?")} → ${String(data?.newCategory ?? "?")}`;
  }
  const titles: Record<string, string> = {
    DELETE_VOX: "Vox eliminado",
    DELETE_COMMENT: "Comentario eliminado",
    BULK_SOFT_DELETE_USER_CONTENT: "Publicaciones eliminadas",
    PIN_VOX: "Vox fijado",
    UNPIN_VOX: "Vox desfijado",
    EDIT_VOX: "Vox editado",
    EDIT_COMMENT: "Comentario editado",
  };
  return titles[row.actionType] ?? moderationActionLabelEs(row.actionType);
};
