"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import {
  authorContentCountsLabel,
  type AuthorBanDraft,
  type BanContentMedia,
} from "@/features/moderation/publicationPlan";
import type { AuthorContentCountsState } from "@/hooks/moderation/useAuthorContentCounts";

type Props = {
  draft: AuthorBanDraft;
  onDraftChange: (patch: Partial<AuthorBanDraft>) => void;
  counts: AuthorContentCountsState;
  /** Blocking is permanent and global: ADMIN only (the server enforces it again). */
  canBlock: boolean;
};

const buildOptions = (canBlock: boolean) => {
  const options: { value: BanContentMedia; label: string; hint: string }[] = [
    {
      value: "keep",
      label: "Conservar los archivos",
      hint: "Se puede deshacer desde el historial con todo su contenido.",
    },
    {
      value: "purge",
      label: "Borrar los archivos",
      hint: "Las imágenes y los videos dejan de servirse al instante, también los de publicaciones que ya estaban ocultas.",
    },
  ];
  if (canBlock) {
    options.push({
      value: "block",
      label: "Borrar y bloquear los archivos",
      hint: "Además nadie va a poder volver a subirlos, en ninguna cuenta. Solo frena copias idénticas.",
    });
  }
  return options;
};

const CountsLine = ({ counts }: { counts: AuthorContentCountsState }) => {
  if (counts.status === "idle") return null;
  const text =
    counts.status === "loading"
      ? "Contando publicaciones…"
      : counts.status === "error"
        ? "No se pudo contar cuántas publicaciones alcanza."
        : authorContentCountsLabel(counts.counts);
  return (
    <p
      className={cn(
        "text-xs",
        counts.status === "error" ? "text-danger-400" : "text-fg-muted",
        counts.status === "loading" && "animate-pulse",
      )}
      aria-live="polite"
    >
      {text}
    </p>
  );
};

/** The files of the author's other publications, once a bulk delete is chosen. */
export const BulkContentMediaSection = ({ draft, onDraftChange, counts, canBlock }: Props) => {
  const group = useId();
  const irreversible = draft.contentMedia !== "keep";
  return (
    <div className="grid gap-2">
      <CountsLine counts={counts} />
      <p className="text-xs font-medium text-fg-soft">Sus archivos</p>
      {buildOptions(canBlock).map((option) => {
        const checked = draft.contentMedia === option.value;
        const danger = option.value !== "keep";
        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-1.5 transition-colors",
              checked
                ? danger
                  ? "border-danger-700/60 bg-danger-950/35"
                  : "border-brand-700/60 bg-brand-950/30"
                : "border-fg/10 hover:bg-surface-elevated/60",
            )}
          >
            <input
              type="radio"
              name={group}
              className={cn(
                "mt-0.5 size-4 shrink-0",
                danger ? "accent-danger-500" : "accent-brand-500",
              )}
              checked={checked}
              onChange={() =>
                onDraftChange({ contentMedia: option.value, contentMediaConfirmed: false })
              }
            />
            <span className="min-w-0">
              <span className="block text-sm text-fg-soft">{option.label}</span>
              <span className="block text-xs text-fg-muted">{option.hint}</span>
            </span>
          </label>
        );
      })}
      {irreversible ? (
        <label className="mt-1 flex cursor-pointer items-start gap-2 rounded-md border border-danger-800/50 bg-danger-950/25 px-2.5 py-2 text-sm text-danger-100">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 rounded accent-danger-500"
            checked={draft.contentMediaConfirmed}
            onChange={(e) => onDraftChange({ contentMediaConfirmed: e.target.checked })}
          />
          <span>Revisé que es el autor correcto. Sus archivos no se van a poder recuperar.</span>
        </label>
      ) : null}
    </div>
  );
};
