"use client";

import type { ModerationSummaryLine } from "@/features/moderation/publicationPlan";

type Props = {
  lines: readonly ModerationSummaryLine[];
};

export const ModerationPlanSummary = ({ lines }: Props) => (
  <div className="rounded-md border border-fg/15 bg-surface-sunken/60 p-3">
    <p className="text-xs font-medium tracking-wide text-fg-soft uppercase">Al confirmar</p>
    <ul className="mt-2 space-y-1.5">
      {lines.map((line) => (
        <li
          key={line.text}
          className={`flex gap-2 text-xs leading-relaxed ${
            line.tone === "danger" ? "text-danger-400" : "text-fg-muted"
          }`}
        >
          <span aria-hidden="true">•</span>
          <span>{line.text}</span>
        </li>
      ))}
    </ul>
  </div>
);
