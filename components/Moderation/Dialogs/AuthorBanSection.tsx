"use client";

import { useId, type ReactNode } from "react";
import type { AuthorBanDraft, BanContentScope } from "@/features/moderation/publicationPlan";
import type { DurationUnit } from "@/lib/time";
import type { PublicationAuthorState } from "@/hooks/moderation/usePublicationModeration";

type Props = {
  owner: PublicationAuthorState;
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  draft: AuthorBanDraft;
  onDraftChange: (patch: Partial<AuthorBanDraft>) => void;
  disabled?: boolean;
};

// `w-full min-w-0`: a number input has an intrinsic width and would overflow its grid column on mobile.
const FIELD_CLASS =
  "w-full min-w-0 rounded-md border border-fg/15 bg-surface-sunken px-2 py-2 text-sm text-fg disabled:opacity-40";

const UNIT_OPTIONS = (
  <>
    <option value="MINUTES">Minutos</option>
    <option value="HOURS">Horas</option>
    <option value="DAYS">Días</option>
  </>
);

type RadioRowProps = {
  name: string;
  checked: boolean;
  onSelect: () => void;
  label: string;
  children?: ReactNode;
};

const RadioRow = ({ name, checked, onSelect, label, children }: RadioRowProps) => (
  <div>
    <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-soft">
      <input
        type="radio"
        name={name}
        className="size-4 shrink-0 accent-brand-500"
        checked={checked}
        onChange={onSelect}
      />
      {label}
    </label>
    {checked && children ? <div className="mt-2 ml-6">{children}</div> : null}
  </div>
);

type AmountUnitProps = {
  amountLabel: string;
  amount: string;
  onAmount: (v: string) => void;
  unit: DurationUnit;
  onUnit: (v: DurationUnit) => void;
};

const AmountUnitFields = ({ amountLabel, amount, onAmount, unit, onUnit }: AmountUnitProps) => (
  <div className="grid grid-cols-2 gap-2">
    <label className="grid min-w-0 gap-1 text-xs text-fg-muted">
      {amountLabel}
      <input
        type="number"
        min={1}
        step={1}
        value={amount}
        onChange={(e) => onAmount(e.target.value)}
        className={FIELD_CLASS}
      />
    </label>
    <label className="grid min-w-0 gap-1 text-xs text-fg-muted">
      Unidad
      <select
        value={unit}
        onChange={(e) => onUnit(e.target.value as DurationUnit)}
        className={FIELD_CLASS}
      >
        {UNIT_OPTIONS}
      </select>
    </label>
  </div>
);

const SCOPE_OPTIONS: { value: BanContentScope; label: string }[] = [
  { value: "none", label: "Ninguna" },
  { value: "window", label: "Las más recientes" },
  { value: "all", label: "Todo su historial" },
];

export const AuthorBanSection = ({
  owner,
  enabled,
  onEnabledChange,
  draft,
  onDraftChange,
  disabled,
}: Props) => {
  const durationGroup = useId();
  const scopeGroup = useId();

  if (owner.status === "loading") {
    return <p className="text-xs text-fg-muted">Cargando datos del autor…</p>;
  }
  if (owner.status === "error") {
    return <p className="text-xs text-danger-400">{owner.message}</p>;
  }
  if (!owner.ownerId) {
    return (
      <p className="text-xs text-fg-muted">
        Esta publicación no tiene una cuenta vinculada: no se puede banear a nadie por ella.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <label
        className={`flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 transition-colors ${
          enabled
            ? "border-caution-700/60 bg-caution-950/30"
            : "border-fg/10 hover:bg-surface-elevated/60"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded accent-caution-500"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        <span>
          <span className="block text-sm text-fg-soft">Banear al autor</span>
          <span className="block text-xs text-fg-muted">
            No va a poder publicar ni comentar mientras dure el ban.
          </span>
        </span>
      </label>

      {enabled ? (
        <fieldset disabled={disabled} className="grid gap-4 border-l-2 border-caution-800/40 pl-3">
          <label className="grid gap-1 text-xs text-fg-muted">
            Motivo (obligatorio)
            <textarea
              value={draft.reason}
              onChange={(e) => onDraftChange({ reason: e.target.value })}
              rows={2}
              placeholder="Ej.: spam, contenido prohibido…"
              className="resize-y rounded-md border border-fg/15 bg-surface-sunken px-2 py-2 text-sm text-fg"
            />
          </label>

          <div className="grid gap-2">
            <p className="text-xs font-medium text-fg-soft">Duración</p>
            <RadioRow
              name={durationGroup}
              checked={!draft.permanent}
              onSelect={() => onDraftChange({ permanent: false })}
              label="Temporal"
            >
              <AmountUnitFields
                amountLabel="Cantidad"
                amount={draft.amount}
                onAmount={(amount) => onDraftChange({ amount })}
                unit={draft.unit}
                onUnit={(unit) => onDraftChange({ unit })}
              />
            </RadioRow>
            <RadioRow
              name={durationGroup}
              checked={draft.permanent}
              onSelect={() => onDraftChange({ permanent: true })}
              label="Permanente"
            />
            <label className="mt-1 flex cursor-pointer items-start gap-2 text-sm text-fg-soft">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 rounded accent-brand-500"
                checked={draft.blockNetwork}
                onChange={(e) => onDraftChange({ blockNetwork: e.target.checked })}
              />
              <span>
                Banear también la red
                <span className="block text-xs text-fg-muted">
                  Alcanza a quien comparta esa conexión.
                </span>
              </span>
            </label>
          </div>

          <div className="grid gap-2">
            <p className="text-xs font-medium text-fg-soft">Otras publicaciones suyas a borrar</p>
            {SCOPE_OPTIONS.map((option) => (
              <RadioRow
                key={option.value}
                name={scopeGroup}
                checked={draft.contentScope === option.value}
                onSelect={() => onDraftChange({ contentScope: option.value })}
                label={option.label}
              >
                {option.value === "window" ? (
                  <AmountUnitFields
                    amountLabel="Publicado en los últimos"
                    amount={draft.contentAmount}
                    onAmount={(contentAmount) => onDraftChange({ contentAmount })}
                    unit={draft.contentUnit}
                    onUnit={(contentUnit) =>
                      onDraftChange({ contentUnit: contentUnit as DurationUnit })
                    }
                  />
                ) : null}
              </RadioRow>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
};
