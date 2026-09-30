"use client";
import { Plus, X } from "lucide-react";
import { ThemeColorField } from "@/components/Theme/ThemeColorField";
import {
  GRADIENT_STOPS_MAX,
  GRADIENT_STOPS_MIN,
  type ThemeGradient,
} from "@/lib/theme/customTheme";
import { cn } from "@/lib/utils";

type Props = {
  value: ThemeGradient;
  onChange: (next: ThemeGradient) => void;
  maxStops?: number;
  idPrefix?: string;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const GradientStopsEditor = ({
  value,
  onChange,
  maxStops = GRADIENT_STOPS_MAX,
  idPrefix = "gradient-stop",
}: Props) => {
  const { stops } = value;

  const updateStop = (index: number, patch: Partial<ThemeGradient["stops"][number]>) =>
    onChange({
      ...value,
      stops: stops.map((stop, i) => (i === index ? { ...stop, ...patch } : stop)),
    });

  const setPosition = (index: number, raw: string) => {
    const parsed = Math.round(Number(raw));
    if (!Number.isFinite(parsed)) return;
    const min = index === 0 ? 0 : stops[index - 1].pos;
    const max = index === stops.length - 1 ? 100 : stops[index + 1].pos;
    updateStop(index, { pos: clamp(parsed, min, max) });
  };

  const addStop = () => {
    if (stops.length >= maxStops) return;
    const last = stops[stops.length - 1];
    const previous = stops[stops.length - 2];
    const inserted = { color: last.color, pos: Math.round((previous.pos + last.pos) / 2) };
    onChange({ ...value, stops: [...stops.slice(0, -1), inserted, last] });
  };

  const removeStop = (index: number) => {
    if (stops.length <= GRADIENT_STOPS_MIN) return;
    onChange({ ...value, stops: stops.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Tipo de degradado" className="grid grid-cols-2 gap-1">
        {(
          [
            ["linear", "Lineal"],
            ["radial", "Radial"],
          ] as const
        ).map(([type, label]) => (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={value.type === type}
            onClick={() => onChange({ ...value, type })}
            className={cn(
              "h-8 cursor-pointer rounded-md text-xs font-medium",
              value.type === type
                ? "bg-brand-600 text-on-solid"
                : "border border-fg/15 text-fg-secondary hover:bg-fg/10",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {value.type === "linear" ? (
        <label className="flex items-center gap-3 text-sm text-fg-soft">
          <span className="w-16 shrink-0">Ángulo</span>
          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={value.angleDeg}
            onChange={(e) =>
              onChange({ ...value, angleDeg: clamp(Math.round(Number(e.target.value)), 0, 359) })
            }
            className="min-w-0 flex-1 accent-brand-600"
          />
          <span className="w-10 text-right font-mono text-xs">{value.angleDeg}°</span>
        </label>
      ) : null}

      <ol className="space-y-3">
        {stops.map((stop, index) => (
          <li key={index} className="space-y-2 rounded-md border border-fg/10 p-2">
            <ThemeColorField
              id={`${idPrefix}-${index}`}
              label={`Color ${index + 1}`}
              value={stop.color}
              overridden={false}
              onChange={(color) => updateStop(index, { color })}
            />
            <div className="flex items-center gap-2 pl-10 text-xs text-fg-muted">
              <label htmlFor={`${idPrefix}-${index}-pos`}>Posición</label>
              <input
                id={`${idPrefix}-${index}-pos`}
                type="number"
                min={0}
                max={100}
                value={stop.pos}
                onChange={(e) => setPosition(index, e.target.value)}
                className="h-7 w-16 rounded-md border border-fg/15 bg-surface-sunken px-2 font-mono text-fg"
              />
              <span>%</span>
              {stops.length > GRADIENT_STOPS_MIN ? (
                <button
                  type="button"
                  onClick={() => removeStop(index)}
                  aria-label={`Quitar color ${index + 1}`}
                  className="ml-auto flex size-7 cursor-pointer items-center justify-center rounded-md hover:bg-fg/10 hover:text-fg"
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {stops.length < maxStops ? (
        <button
          type="button"
          onClick={addStop}
          className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-brand-300 hover:bg-fg/10"
        >
          <Plus className="size-4" aria-hidden />
          Agregar color
        </button>
      ) : null}
    </div>
  );
};
