"use client";

import { cn } from "@/lib/utils";

export type PurgePublicationMediaChoice = {
  purge: boolean;
  block: boolean;
};

type Props = {
  value: PurgePublicationMediaChoice;
  onChange: (next: PurgePublicationMediaChoice) => void;
  /** Blocking is permanent and global: ADMIN only (the server enforces it again). */
  canBlock: boolean;
  disabled?: boolean;
};

const IrreversibleBadge = () => (
  <span className="rounded bg-danger-950/60 px-1.5 py-px text-[10px] font-semibold tracking-wide text-danger-300 uppercase">
    Irreversible
  </span>
);

type OptionProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  hint: string;
  disabled?: boolean;
};

const Option = ({ checked, onCheckedChange, label, hint, disabled }: OptionProps) => (
  <label
    className={cn(
      "flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 transition-colors",
      checked
        ? "border-danger-700/60 bg-danger-950/35"
        : "border-fg/10 hover:bg-surface-elevated/60",
      disabled && "pointer-events-none opacity-60",
    )}
  >
    <input
      type="checkbox"
      className="mt-0.5 size-4 shrink-0 rounded accent-danger-500"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
    <span className="min-w-0">
      <span className="flex flex-wrap items-center gap-x-2 text-sm text-fg-soft">
        {label}
        <IrreversibleBadge />
      </span>
      <span className="block text-xs text-fg-muted">{hint}</span>
    </span>
  </label>
);

/** Same ladder as the moderation dialog's publication step: blocking implies deleting. */
export const PurgePublicationMediaOptions = ({ value, onChange, canBlock, disabled }: Props) => (
  <div className="grid gap-1.5">
    <Option
      checked={value.purge}
      onCheckedChange={(purge) => onChange({ purge, block: purge && value.block })}
      label="Borrar también el archivo"
      hint="La imagen o el video dejan de servirse al instante."
      disabled={disabled}
    />
    {canBlock && value.purge ? (
      <div className="ml-6">
        <Option
          checked={value.block}
          onCheckedChange={(block) => onChange({ purge: true, block })}
          label="Bloquear el archivo"
          hint="Nadie va a poder volver a subirlo, en ninguna cuenta. Solo frena copias idénticas: recortado o recomprimido pasa igual."
          disabled={disabled}
        />
      </div>
    ) : null}
  </div>
);
