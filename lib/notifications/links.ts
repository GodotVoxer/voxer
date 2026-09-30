import { voxPath } from "@/lib/vox/paths";

/** `?denuncia=push` is part of the deep-link contract with the Android app. */
export const buildVoxPanelDetailHref = (
  row: { voxId: string; anchorUpper: string | null },
  options?: { markModerationNotificationsRead?: boolean },
): string =>
  `${voxPath(row.voxId)}${options?.markModerationNotificationsRead ? "?denuncia=push" : ""}${
    row.anchorUpper ? `#${row.anchorUpper}` : ""
  }`;
