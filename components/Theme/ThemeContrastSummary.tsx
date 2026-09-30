"use client";
import { useMemo } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { findContrastIssues } from "@/lib/theme/customTheme";
import { contrastTokenLabel } from "@/lib/theme/customThemeLabels";
import type { ThemeTokenMap } from "@/lib/theme/themeTokens";

const VISIBLE_ISSUES_MAX = 6;

export const ThemeContrastSummary = ({ tokens }: { tokens: ThemeTokenMap }) => {
  const issues = useMemo(() => findContrastIssues(tokens), [tokens]);

  if (issues.length === 0) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-success-400">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden />
        Todos los textos cumplen el contraste recomendado (WCAG AA).
      </p>
    );
  }

  return (
    <div
      role="status"
      className="space-y-2 rounded-md border border-warning-800/60 bg-warning-950/40 p-3 text-sm"
    >
      <p className="flex items-center gap-2 font-medium text-warning-200">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        {issues.length === 1
          ? "Un texto puede costar leerse"
          : `${issues.length} textos pueden costar leerse`}
      </p>
      <ul className="space-y-1 text-fg-soft">
        {issues.slice(0, VISIBLE_ISSUES_MAX).map((issue) => (
          <li key={`${issue.fg}-${issue.bg}`}>
            {contrastTokenLabel(issue.fg)} sobre {contrastTokenLabel(issue.bg).toLowerCase()}:{" "}
            <span className="font-mono">{issue.ratio.toFixed(1)}:1</span>{" "}
            <span className="text-fg-subtle">(mínimo {issue.min}:1)</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-fg-muted">
        Podés guardarlo igual. Si algo queda ilegible, abrí Voxer con{" "}
        <span className="font-mono">?tema=seguro</span> para volver a verlo bien y editarlo.
      </p>
    </div>
  );
};
