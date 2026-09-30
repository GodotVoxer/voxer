"use client";
import { useState } from "react";
import { GradientStopsEditor } from "@/components/Theme/GradientStopsEditor";
import { ThemeBackgroundImagePicker } from "@/components/Theme/ThemeBackgroundImagePicker";
import { ThemeColorField } from "@/components/Theme/ThemeColorField";
import { useThemeStore } from "@/features/theme/store";
import type { VoxBackground } from "@/lib/theme/customTheme";
import { voxBackgroundStyle } from "@/features/theme/voxBackgroundStyle";
import { cn } from "@/lib/utils";

type Props = {
  value: VoxBackground;
  onChange: (next: VoxBackground) => void;
  /** Colors of the edited theme, to start a solid or gradient with something coherent. */
  surfaceColor: string;
  accentColor: string;
};

const KIND_OPTIONS: { kind: VoxBackground["kind"]; label: string }[] = [
  { kind: "none", label: "Ninguno" },
  { kind: "solid", label: "Color" },
  { kind: "gradient", label: "Degradado" },
  { kind: "image", label: "Imagen" },
];

export const VoxBackgroundEditor = ({ value, onChange, surfaceColor, accentColor }: Props) => {
  // Image can be chosen before having one: the background only changes once an image is picked.
  const [mode, setMode] = useState<VoxBackground["kind"]>(value.kind);
  const assets = useThemeStore((s) => s.themeAssets);
  const previewImage =
    value.kind === "image" ? assets?.find((asset) => asset.id === value.assetId) : undefined;

  const selectKind = (kind: VoxBackground["kind"]) => {
    setMode(kind);
    if (kind === value.kind || kind === "image") return;
    if (kind === "none") onChange({ kind: "none" });
    if (kind === "solid") onChange({ kind: "solid", color: surfaceColor });
    if (kind === "gradient") {
      onChange({
        kind: "gradient",
        type: "linear",
        angleDeg: 160,
        stops: [
          { color: surfaceColor, pos: 0 },
          { color: accentColor, pos: 100 },
        ],
      });
    }
  };

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Fondo del vox" className="grid grid-cols-4 gap-1">
        {KIND_OPTIONS.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={mode === kind}
            onClick={() => selectKind(kind)}
            className={cn(
              "h-8 cursor-pointer rounded-md text-xs font-medium",
              mode === kind
                ? "bg-brand-600 text-on-solid"
                : "border border-fg/15 text-fg-secondary hover:bg-fg/10",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "solid" && value.kind === "solid" ? (
        <ThemeColorField
          id="vox-background-solid"
          label="Color de fondo"
          value={value.color}
          overridden={false}
          onChange={(color) => onChange({ kind: "solid", color })}
        />
      ) : null}

      {mode === "gradient" && value.kind === "gradient" ? (
        <GradientStopsEditor value={value} onChange={onChange} />
      ) : null}

      {mode === "image" ? (
        <ThemeBackgroundImagePicker
          value={value.kind === "image" ? value : null}
          onChange={(next) => {
            setMode(next.kind);
            onChange(next);
          }}
        />
      ) : null}

      <div
        aria-hidden
        className="h-16 rounded-md border border-fg/15 bg-surface-vox-detail"
        style={voxBackgroundStyle(value, previewImage?.urlSm)}
      />
      <p className="text-xs text-fg-subtle">
        Se ve detrás del contenido al abrir un vox. Solo lo ves vos.
      </p>
    </div>
  );
};
