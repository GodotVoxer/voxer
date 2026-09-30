"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PurgePublicationMediaOptions,
  type PurgePublicationMediaChoice,
} from "@/components/Moderation/Dialogs/PurgePublicationMediaOptions";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";
import { cn } from "@/lib/utils";
import type { AsyncConfirmResult } from "@/features/moderation/types";

const NO_PURGE: PurgePublicationMediaChoice = { purge: false, block: false };

export type AsyncConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "destructive" | "default";
  onConfirm: (result: AsyncConfirmResult) => Promise<void>;
  successMessage?: string;
  /** Only when the publication has its own media. */
  showPurgePublicationMedia?: boolean;
  canBlockPublicationMedia?: boolean;
};

export const AsyncConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "destructive",
  onConfirm,
  successMessage = "Listo.",
  showPurgePublicationMedia = false,
  canBlockPublicationMedia = false,
}: AsyncConfirmDialogProps) => {
  const [phase, setPhase] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [mediaChoice, setMediaChoice] = useState<PurgePublicationMediaChoice>(NO_PURGE);

  const resetDialogState = () => {
    setPhase("idle");
    setErrorText(null);
    setMediaChoice(NO_PURGE);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetDialogState();
    onOpenChange(nextOpen);
  };

  const run = async () => {
    setPhase("loading");
    setErrorText(null);
    try {
      const purge = showPurgePublicationMedia && mediaChoice.purge;
      await onConfirm({
        purgePublicationMedia: purge,
        blockPublicationMedia: purge && canBlockPublicationMedia && mediaChoice.block,
      });
      setPhase("success");
      window.setTimeout(() => {
        handleOpenChange(false);
      }, 650);
    } catch (e) {
      setPhase("error");
      setErrorText(userFacingApiErrorMessage(e) ?? "Algo salió mal. Reintentá.");
    }
  };

  const busy = phase === "loading";
  const done = phase === "success";

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && !done && handleOpenChange(next)}>
      <DialogContent className="border-fg/10 sm:max-w-md" showClose={!busy && !done}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-fg-secondary">{description}</DialogDescription>
        </DialogHeader>

        {showPurgePublicationMedia && phase !== "success" ? (
          <PurgePublicationMediaOptions
            value={mediaChoice}
            onChange={setMediaChoice}
            canBlock={canBlockPublicationMedia}
            disabled={busy}
          />
        ) : null}

        {phase === "success" ? (
          <p className="text-sm font-medium text-success-400">{successMessage}</p>
        ) : null}
        {errorText ? <p className="text-sm text-danger-400">{errorText}</p> : null}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={busy || done}
            onClick={() => handleOpenChange(false)}
          >
            {phase === "error" ? "Cerrar" : cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={busy || done}
            className={cn(
              "cursor-pointer",
              confirmVariant === "destructive"
                ? "bg-danger-900/90 text-fg hover:bg-danger-800"
                : "bg-brand-700 text-on-solid hover:bg-brand-600",
            )}
            onClick={() => void run()}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden />
                Procesando…
              </>
            ) : done ? (
              "Hecho"
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
