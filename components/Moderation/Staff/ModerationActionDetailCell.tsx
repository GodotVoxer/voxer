"use client";
import type { ModerationActionRow } from "@/features/moderation/api";
import { moderationActionPayloadSummary } from "@/features/moderation/actionLabels";
import { moderationActionTargets } from "@/lib/moderation/actionTargets";

export const ModerationActionDetailCell = ({
  actionRow,
  onOpenPreview,
}: {
  actionRow: ModerationActionRow;
  onOpenPreview: (action: ModerationActionRow) => void;
}) => {
  const detailText = moderationActionPayloadSummary(actionRow);
  return (
    <td className="max-w-[280px] p-2 text-fg-secondary">
      {moderationActionTargets(actionRow.payload).length ? (
        <button
          type="button"
          className="block max-w-full cursor-pointer truncate text-left text-brand-300 underline decoration-brand-500/40 underline-offset-2 hover:text-brand-200"
          title={detailText}
          onClick={() => onOpenPreview(actionRow)}
        >
          {detailText}
        </button>
      ) : (
        <span className="block truncate" title={detailText}>
          {detailText}
        </span>
      )}
    </td>
  );
};
