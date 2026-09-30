"use client";
import { useState, type KeyboardEvent } from "react";
import { HexAlphaColorPicker } from "react-colorful";
import { Pipette, RotateCcw } from "lucide-react";
import { normalizeHexColorInput } from "@/lib/theme/hexColorInput";
import { cn } from "@/lib/utils";

type EyeDropperResult = { sRGBHex: string };
type EyeDropperWindow = Window & {
  EyeDropper?: new () => { open: () => Promise<EyeDropperResult> };
};

type Props = {
  id: string;
  label: string;
  value: string;
  overridden: boolean;
  onChange: (color: string) => void;
  onReset?: () => void;
};

export const ThemeColorField = ({ id, label, value, overridden, onChange, onReset }: Props) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [text, setText] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const [lastValue, setLastValue] = useState(value);

  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
    setInvalid(false);
  }

  const commitText = () => {
    const normalized = normalizeHexColorInput(text);
    if (!normalized) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (normalized !== value) onChange(normalized);
    else setText(normalized);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitText();
  };

  const eyeDropper =
    typeof window !== "undefined" ? (window as EyeDropperWindow).EyeDropper : undefined;

  const pickFromScreen = async () => {
    if (!eyeDropper) return;
    try {
      const result = await new eyeDropper().open();
      const normalized = normalizeHexColorInput(result.sRGBHex);
      if (normalized) onChange(normalized);
    } catch {
      /* the user cancelled */
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Elegir color: ${label}`}
          aria-expanded={pickerOpen}
          aria-controls={`${id}-picker`}
          onClick={() => setPickerOpen((open) => !open)}
          className="size-8 shrink-0 cursor-pointer rounded-md border border-fg/20 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
          style={{ backgroundColor: value }}
        />
        <label htmlFor={`${id}-hex`} className="min-w-0 flex-1 truncate text-sm text-fg-soft">
          {label}
          {overridden ? <span className="ml-1.5 text-xs text-brand-300">· cambiado</span> : null}
        </label>
        <input
          id={`${id}-hex`}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setInvalid(false);
          }}
          onBlur={commitText}
          onKeyDown={onKeyDown}
          aria-invalid={invalid}
          spellCheck={false}
          maxLength={9}
          className={cn(
            "h-8 w-[6.5rem] shrink-0 rounded-md border bg-surface-sunken px-2 font-mono text-xs text-fg outline-none",
            "focus-visible:ring-2 focus-visible:ring-brand-500/60",
            invalid ? "border-danger-500" : "border-fg/15",
          )}
        />
        {eyeDropper ? (
          <button
            type="button"
            onClick={() => void pickFromScreen()}
            aria-label={`Tomar color de la pantalla: ${label}`}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-fg/10 hover:text-fg"
          >
            <Pipette className="size-4" aria-hidden />
          </button>
        ) : null}
        {overridden && onReset ? (
          <button
            type="button"
            onClick={onReset}
            aria-label={`Restablecer ${label}`}
            title="Restablecer al valor del tema base"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-fg/10 hover:text-fg"
          >
            <RotateCcw className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {invalid ? (
        <p className="text-xs text-danger-400">Usá un color hex, por ejemplo #7c3aed.</p>
      ) : null}
      {pickerOpen ? (
        <div id={`${id}-picker`} className="theme-color-picker pl-10">
          <HexAlphaColorPicker
            color={value}
            onChange={(picked) => {
              const normalized = normalizeHexColorInput(picked);
              if (normalized) onChange(normalized);
            }}
          />
        </div>
      ) : null}
    </div>
  );
};
