"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VoxDetailMedia } from "@/components/Vox/Detail/VoxDetailMedia";
import { ModerationCommentPreview } from "@/components/Moderation/Dialogs/ModerationCommentPreview";
import { fetchModerationActionPreview, type ModerationActionRow } from "@/features/moderation/api";
import type { ModerationActionPreviewPage } from "@/lib/moderation/actionPreviewTypes";
import {
  moderationActionPreviewTitle,
  moderationActionPayloadSummary,
} from "@/features/moderation/actionLabels";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";
import { formatDateTimeEs } from "@/lib/format/dates";

export const ModerationActionPreviewDialog = ({
  action,
  onClose,
}: {
  action: ModerationActionRow;
  onClose: () => void;
}) => {
  const [offset, setOffset] = useState(0);
  const [loaded, setLoaded] = useState<{
    offset: number;
    page: ModerationActionPreviewPage | null;
    error: string | null;
  } | null>(null);
  const page = loaded?.offset === offset ? loaded.page : null;
  const error = loaded?.offset === offset ? loaded.error : null;
  useEffect(() => {
    let cancelled = false;
    fetchModerationActionPreview(action.id, offset).then(
      (result) => {
        if (!cancelled) setLoaded({ offset, page: result, error: null });
      },
      (e) => {
        if (!cancelled)
          setLoaded({
            offset,
            page: null,
            error: userFacingApiErrorMessage(e) ?? "No se pudo cargar la publicación.",
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [action.id, offset]);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="min-w-0 max-h-[90dvh] overflow-y-auto border-fg/10 sm:max-w-2xl [overflow-wrap:anywhere]"
        aria-describedby={undefined}
      >
        <DialogHeader className="min-w-0 pr-6">
          <DialogTitle>{moderationActionPreviewTitle(action)}</DialogTitle>
        </DialogHeader>
        <p className="min-w-0 whitespace-pre-wrap text-sm text-fg-secondary">
          {moderationActionPayloadSummary(action)}
        </p>
        <p className="text-xs text-fg-muted">
          {formatDateTimeEs(action.createdAt)}
          {action.undoneAt ? " · Acción deshecha" : ""}
        </p>
        {error ? (
          <p role="alert" className="text-danger-400">
            {error}
          </p>
        ) : !page ? (
          <p>Cargando…</p>
        ) : (
          <div className="min-w-0 space-y-4">
            {page.items.map((item) => (
              <article
                key={item.kind + item.id}
                className="min-w-0 rounded-md border border-fg/10 p-3"
              >
                {item.kind === "comment" && item.comment ? (
                  <ModerationCommentPreview comment={item.comment} />
                ) : item.kind === "vox" && item.vox ? (
                  <div className="min-w-0 space-y-3">
                    <h3 className="whitespace-pre-wrap text-lg font-semibold">{item.vox.title}</h3>
                    <p className="text-xs text-fg-muted">
                      {item.vox.category} · {formatDateTimeEs(item.vox.createdAt)}
                    </p>
                    {item.vox.mediaUrl || item.vox.youtubeVideoId ? (
                      <VoxDetailMedia {...item.vox} alt={item.vox.title} />
                    ) : null}
                    <p className="whitespace-pre-wrap text-sm">{item.vox.description}</p>
                  </div>
                ) : (
                  <p className="text-sm text-fg-muted">
                    Publicación no disponible. Puede haber sido purgada antes de guardar una copia.
                  </p>
                )}
              </article>
            ))}
            <p className="text-xs text-fg-muted">
              Publicaciones {page.total ? offset + 1 : 0}–{offset + page.items.length} de{" "}
              {page.total}. La multimedia purgada no se muestra.
            </p>
            {page.total > 10 ? (
              <div className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - 10))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={page.nextOffset === null}
                  onClick={() => {
                    if (page.nextOffset !== null) setOffset(page.nextOffset);
                  }}
                >
                  Siguiente
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
