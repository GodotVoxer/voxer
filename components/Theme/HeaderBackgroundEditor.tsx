"use client";
import { GradientStopsEditor } from "@/components/Theme/GradientStopsEditor";
import { ThemeColorField } from "@/components/Theme/ThemeColorField";
import { HEADER_GRADIENT_STOPS_MAX, type HeaderBackground } from "@/lib/theme/customTheme";
import { headerBackgroundCss } from "@/lib/theme/headerBackgroundCss";
import { cn } from "@/lib/utils";

type Mode = HeaderBackground["kind"];

type Props = {
  value: HeaderBackground;
  onChange: (next: HeaderBackground) => void;
  surfaceColor: string;
  accentColor: string;
};

export const HeaderBackgroundEditor = ({ value, onChange, surfaceColor, accentColor }: Props) => {
  const setMode = (mode: Mode) => {
    if (mode === value.kind) return;
    if (mode === "none") onChange({ kind: "none" });
    if (mode === "solid") onChange({ kind: "solid", color: surfaceColor });
    if (mode === "gradient") {
      onChange({
        kind: "gradient",
        type: "linear",
        angleDeg: 180,
        stops: [
          { color: accentColor, pos: 0 },
          { color: surfaceColor, pos: 100 },
        ],
      });
    }
  };

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Fondo del encabezado" className="grid grid-cols-3 gap-1">
        {(
          [
            ["none", "Base"],
            ["solid", "Color"],
            ["gradient", "Degradado"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={value.kind === mode}
            onClick={() => setMode(mode)}
            className={cn(
              "h-8 cursor-pointer rounded-md text-xs font-medium",
              value.kind === mode
                ? "bg-brand-600 text-on-solid"
                : "border border-fg/15 text-fg-secondary hover:bg-fg/10",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {value.kind === "solid" ? (
        <ThemeColorField
          id="header-background-solid"
          label="Color de fondo"
          value={value.color}
          overridden={false}
          onChange={(color) => onChange({ kind: "solid", color })}
        />
      ) : null}

      {value.kind === "gradient" ? (
        <GradientStopsEditor
          value={value}
          onChange={onChange}
          maxStops={HEADER_GRADIENT_STOPS_MAX}
          idPrefix="header-gradient-stop"
        />
      ) : null}

      <div
        aria-hidden
        className="h-11 rounded-md border border-fg/15 bg-surface-sunken"
        style={{ backgroundImage: headerBackgroundCss(value) ?? undefined }}
      />
      <p className="text-xs text-fg-subtle">
        Se aplica solo a la barra superior. Los controles mantienen una capa oscura para leerse
        bien.
      </p>
    </div>
  );
};
