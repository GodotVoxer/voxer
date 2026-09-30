"use client";
import { useSettingsStore, type CommentSubmitShortcut } from "@/features/settings/store";
import { cn } from "@/lib/utils";

const OPTIONS: { value: CommentSubmitShortcut; label: string; description: string }[] = [
  {
    value: "shift-enter",
    label: "Shift + Enter",
    description: "Enter agrega una nueva línea.",
  },
  {
    value: "enter",
    label: "Enter",
    description: "Shift + Enter agrega una nueva línea.",
  },
  {
    value: "none",
    label: "Ninguno",
    description: "Publicás únicamente con el botón.",
  },
];

export const CommentSubmitShortcutPicker = () => {
  const shortcut = useSettingsStore((s) => s.commentSubmitShortcut);
  const setShortcut = useSettingsStore((s) => s.setCommentSubmitShortcut);

  return (
    <div className="space-y-2 py-3">
      <p className="text-sm font-medium text-fg">Teclado para publicar comentarios</p>
      <p className="text-xs leading-relaxed text-fg-muted">
        Elegí qué combinación publica mientras escribís un comentario.
      </p>
      <div className="grid gap-1.5 pt-1" role="group" aria-label="Atajo para publicar comentarios">
        {OPTIONS.map((option) => {
          const selected = shortcut === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              className={cn(
                "rounded-md border px-3 py-2 text-left transition-colors",
                selected
                  ? "border-brand-500/60 bg-brand-950/40 text-fg"
                  : "border-fg/10 text-fg-muted hover:bg-fg/5",
              )}
              onClick={() => setShortcut(option.value)}
            >
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs opacity-75">{option.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
