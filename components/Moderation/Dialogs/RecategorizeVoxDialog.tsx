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
import { VOX_CATEGORIES_ALPHABETICAL } from "@/lib/vox/categories";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryValue: string;
  onCategoryChange: (value: string) => void;
  onSave: () => void | Promise<void>;
};

export const RecategorizeVoxDialog = ({
  open,
  onOpenChange,
  categoryValue,
  onCategoryChange,
  onSave,
}: Props) => {
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSaveError(null);
      setBusy(false);
    }
    onOpenChange(nextOpen);
  };

  const handleSave = async () => {
    setSaveError(null);
    setBusy(true);
    try {
      await Promise.resolve(onSave());
    } catch (e) {
      setSaveError(userFacingApiErrorMessage(e) ?? "No se pudo actualizar la categoría.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <UiDialog open={open} onOpenChange={handleOpenChange}>
      <UiDialogContent className="border-fg/10 sm:max-w-md" aria-describedby={undefined}>
        <UiDialogHeader>
          <UiDialogTitle>Recategorizar vox</UiDialogTitle>
        </UiDialogHeader>
        <div className="space-y-2 py-2">
          <select
            value={categoryValue}
            onChange={(e) => onCategoryChange(e.target.value)}
            disabled={busy}
            className="w-full rounded-md border border-fg/15 bg-surface-sunken px-2 py-2 text-sm text-fg"
          >
            {VOX_CATEGORIES_ALPHABETICAL.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {saveError ? <p className="text-sm text-danger-400">{saveError}</p> : null}
        </div>
        <UiDialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={busy} onClick={() => void handleSave()}>
            {busy ? "Guardando…" : "Guardar"}
          </Button>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  );
};
