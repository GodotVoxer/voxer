"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import type { PublicationFate } from "@/features/moderation/publicationPlan";

type Option = {
  value: PublicationFate;
  label: string;
  hint: string;
  irreversible?: boolean;
};

const buildOptions = (kind: "vox" | "comment", canBlock: boolean): Option[] => {
  const noun = kind === "vox" ? "el vox" : "el comentario";
  const options: Option[] = [
    {
      value: "keep",
      label: "Dejarla publicada",
      hint: "Solo actuar sobre el autor.",
    },
    {
      value: "delete",
      label: "Eliminar",
      hint: `Deja de verse ${noun}. Se puede deshacer desde el historial durante 7 días.`,
    },
    {
      value: "purge",
      label: "Eliminar y borrar el archivo",
      hint: "Además la imagen o el video dejan de servirse al instante.",
      irreversible: true,
    },
  ];
  if (canBlock) {
    options.push({
      value: "block",
      label: "Eliminar, borrar y bloquear el archivo",
      hint: "Además nadie va a poder volver a subir ese archivo, en ninguna cuenta. Solo frena copias idénticas: recortado o recomprimido pasa igual.",
      irreversible: true,
    });
  }
  return options;
};

type Props = {
  kind: "vox" | "comment";
  value: PublicationFate;
  onChange: (next: PublicationFate) => void;
  canBlock: boolean;
  disabled?: boolean;
};

/** The options form a ladder (each includes the previous), so they are one radio group. */
export const PublicationFatePicker = ({ kind, value, onChange, canBlock, disabled }: Props) => {
  const name = useId();
  return (
    <div role="radiogroup" className="grid gap-1.5">
      {buildOptions(kind, canBlock).map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 transition-colors",
              checked
                ? option.irreversible
                  ? "border-danger-700/60 bg-danger-950/35"
                  : "border-brand-700/60 bg-brand-950/30"
                : "border-fg/10 hover:bg-surface-elevated/60",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <input
              type="radio"
              name={name}
              className={cn(
                "mt-0.5 size-4 shrink-0",
                option.irreversible ? "accent-danger-500" : "accent-brand-500",
              )}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(option.value)}
            />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-x-2 text-sm text-fg-soft">
                {option.label}
                {option.irreversible ? (
                  <span className="rounded bg-danger-950/60 px-1.5 py-px text-[10px] font-semibold tracking-wide text-danger-300 uppercase">
                    Irreversible
                  </span>
                ) : null}
              </span>
              <span className="block text-xs text-fg-muted">{option.hint}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
};
