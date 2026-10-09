"use client";
import { useState } from "react";
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
  const [expanded, setExpanded] = useState(false);
  const detailText = moderationActionPayloadSummary(actionRow);
  return (
    <td className="min-w-[240px] max-w-[280px] break-words p-2 text-fg-secondary">
      {moderationActionTargets(actionRow.payload).length ? (
        <button
          type="button"
          className="line-clamp-3 max-w-full cursor-pointer text-left text-brand-300 underline decoration-brand-500/40 underline-offset-2 hover:text-brand-200"
          onClick={() => onOpenPreview(actionRow)}
        >
          {detailText}
        </button>
      ) : (
        <button
          type="button"
          aria-expanded={expanded}
          className={
            expanded
              ? "max-w-full cursor-pointer whitespace-pre-wrap text-left"
              : "line-clamp-3 max-w-full cursor-pointer text-left"
          }
          onClick={() => setExpanded((v) => !v)}
        >
          {detailText}
        </button>
      )}
    </td>
  );
};
