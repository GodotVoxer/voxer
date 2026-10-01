"use client";

import { useMemo, useState } from "react";
import { FileDropHintOverlay } from "@/components/FileDrop/FileDropHintOverlay";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDropFilesOverlay } from "@/hooks/media/useDropFilesOverlay";
import { getFirstClipboardVoxUploadFile } from "@/features/media/uploadClientFiles";
import { parseMediaLink } from "@/features/media/mediaLink";
import { youtubeThumbnailUrl } from "@/lib/media/youtube";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Link already applied in the composer; copied into the draft on open. */
  initialDraft: string;
  onApply: (trimmedUrl: string) => void;
  /** Pasting an image from the clipboard uses it as a file attachment and closes the dialog. */
  onPasteImageFile?: (file: File) => void;
};

const primaryBtn = "bg-brand-600 text-on-solid hover:bg-brand-500 shadow-sm";

const previewFromDraft = (draft: string) => {
  const parsed = parseMediaLink(draft);
  if (parsed?.kind === "YOUTUBE") {
    return {
      thumb: youtubeThumbnailUrl(parsed.videoId),
      label: "YouTube" as const,
    };
  }
  if (parsed?.kind === "IMAGE") {
    return { thumb: parsed.url, label: "Imagen" as const };
  }
  return { thumb: null as string | null, label: null as null };
};

export const CommentLinkAttachDialog = ({
  open,
  onOpenChange,
  initialDraft,
  onApply,
  onPasteImageFile,
}: Props) => {
  const [draft, setDraft] = useState(initialDraft);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(initialDraft);
  }

  const preview = useMemo(() => previewFromDraft(draft), [draft]);
  const canApply = Boolean(parseMediaLink(draft.trim()));

  const { showDropOverlay, dropHandlers } = useDropFilesOverlay({
    onDropFile: (file) => {
      onPasteImageFile?.(file);
      onOpenChange(false);
    },
    disabled: !open || !onPasteImageFile,
  });

  const handleApply = () => {
    if (!canApply) return;
    onApply(draft.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-fg/10 sm:max-w-md" showClose>
        <div className="relative grid min-h-0 w-full gap-4" {...dropHandlers}>
          <DialogHeader>
            <DialogTitle className="text-fg-bright">Adjuntar enlace</DialogTitle>
            <DialogDescription className="text-fg-muted">
              Pegá la URL de una imagen (https) o de un video de YouTube, pegá una imagen o video
              copiados desde otra pestaña, o arrastrá un archivo aquí. La vista previa del enlace se
              actualiza al escribir.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="overflow-hidden rounded-md border border-fg/15 bg-shade/40">
              <p className="border-b border-fg/10 bg-surface-sunken/80 px-3 py-2 text-xs text-fg-muted">
                Vista previa
              </p>
              <div className="relative flex min-h-[160px] items-center justify-center p-3">
                {preview.thumb ? (
                  <>
                    {preview.label ? (
                      <span className="absolute left-2 top-2 rounded border border-fg/15 bg-surface-sunken/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-secondary">
                        {preview.label}
                      </span>
                    ) : null}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview.thumb} alt="" className="max-h-48 w-full object-contain" />
                  </>
                ) : (
                  <p className="px-4 text-center text-sm text-fg-subtle">
                    La vista previa aparece cuando el enlace es válido.
                  </p>
                )}
              </div>
            </div>
            <label className="grid gap-1.5 text-sm text-fg-secondary">
              Enlace
              <input
                autoFocus
                className="rounded-md border border-fg/15 bg-surface-sunken px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onPaste={(e) => {
                  if (!onPasteImageFile) return;
                  const mediaFile = getFirstClipboardVoxUploadFile(e.nativeEvent);
                  if (!mediaFile) return;
                  e.preventDefault();
                  onPasteImageFile(mediaFile);
                  onOpenChange(false);
                }}
                placeholder="https://… (imagen) o enlace de YouTube"
              />
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer border-fg/25 bg-surface-sunken text-fg-soft hover:bg-surface-raised hover:text-fg"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!canApply}
              className={`cursor-pointer ${primaryBtn}`}
              onClick={handleApply}
            >
              Aplicar enlace
            </Button>
          </DialogFooter>
          <FileDropHintOverlay show={showDropOverlay} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
