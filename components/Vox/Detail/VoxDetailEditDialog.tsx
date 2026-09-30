"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogFooter as UiDialogFooter,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
} from "@/components/ui/dialog";
import { VOX_DESCRIPTION_MAX, VOX_TITLE_MAX } from "@/lib/limits";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";
import type { VoxEditDraft } from "@/features/moderation/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: VoxEditDraft;
  onDraftChange: (draft: VoxEditDraft) => void;
  /** Saved text: the button stays inert until the draft changes it. */
  savedTitle: string;
  savedDescription: string;
  onSave: (values: VoxEditDraft) => void | Promise<void>;
};

export const VoxDetailEditDialog = ({
  open,
  onOpenChange,
  draft,
  onDraftChange,
  savedTitle,
  savedDescription,
  onSave,
}: Props) => {
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const trimmedTitle = draft.title.trim();
  const trimmedDescription = draft.description.trim();
  const unchanged = trimmedTitle === savedTitle && trimmedDescription === savedDescription;
  const empty = trimmedTitle.length === 0 || trimmedDescription.length === 0;

  const handleOpenChange = (nextOpen: boolean) => {
    if (busy) return;
    if (!nextOpen) setSaveError(null);
    onOpenChange(nextOpen);
  };

  const handleSave = async () => {
    setSaveError(null);
    setBusy(true);
    try {
      await Promise.resolve(onSave({ title: trimmedTitle, description: trimmedDescription }));
    } catch (e) {
      setSaveError(userFacingApiErrorMessage(e) ?? "No se pudo guardar el vox.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <UiDialog open={open} onOpenChange={handleOpenChange}>
      <UiDialogContent className="border-fg/10 sm:max-w-lg" aria-describedby={undefined}>
        <UiDialogHeader>
          <UiDialogTitle>Editar vox</UiDialogTitle>
        </UiDialogHeader>
        <div className="space-y-3 py-2">
          <label className="grid gap-1 text-sm text-fg-secondary">
            Título
            <input
              className="rounded-md border border-fg/15 bg-surface-sunken px-3 py-2 text-sm text-fg"
              value={draft.title}
              onChange={(e) => onDraftChange({ ...draft, title: e.target.value })}
              maxLength={VOX_TITLE_MAX}
              disabled={busy}
            />
          </label>
          <label className="grid gap-1 text-sm text-fg-secondary">
            Descripción
            <textarea
              className="max-h-[50vh] min-h-[140px] rounded-md border border-fg/15 bg-surface-sunken px-3 py-2 text-sm text-fg"
              value={draft.description}
              onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
              maxLength={VOX_DESCRIPTION_MAX}
              disabled={busy}
            />
          </label>
          <p className="text-xs text-fg-muted">
            Solo cambian el título y la descripción: la categoría, el multimedia y la encuesta
            quedan como están.
          </p>
          {saveError ? <p className="text-sm text-danger-400">{saveError}</p> : null}
        </div>
        <UiDialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={busy || empty || unchanged}
            onClick={() => void handleSave()}
          >
            {busy ? "Guardando…" : "Guardar"}
          </Button>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  );
};
