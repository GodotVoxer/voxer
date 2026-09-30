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
import type { CommentPublic } from "@/lib/vox/types";
import { COMMENT_BODY_MAX } from "@/lib/limits";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";
import type { CommentEditValues } from "@/features/moderation/types";

type Props = {
  /** Comment to edit; `null` closes the dialog. */
  comment: CommentPublic | null;
  onOpenChange: (open: boolean) => void;
  /** The reader owns the vox: only then does choosing to show as OP make sense. */
  voxIsOwner: boolean;
  onSave: (commentId: string, values: CommentEditValues) => Promise<void>;
};

export const CommentEditDialog = ({ comment, onOpenChange, voxIsOwner, onSave }: Props) => {
  const [busy, setBusy] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (busy) return;
    onOpenChange(nextOpen);
  };

  return (
    <UiDialog open={comment !== null} onOpenChange={handleOpenChange}>
      <UiDialogContent className="border-fg/10 sm:max-w-lg" aria-describedby={undefined}>
        <UiDialogHeader>
          <UiDialogTitle>Editar comentario</UiDialogTitle>
        </UiDialogHeader>
        {comment ? (
          // The form mounts per comment and seeds its draft once: a live thread update does not overwrite
          // what is being typed.
          <CommentEditForm
            key={comment.id}
            comment={comment}
            voxIsOwner={voxIsOwner}
            busy={busy}
            setBusy={setBusy}
            onCancel={() => handleOpenChange(false)}
            onSave={onSave}
          />
        ) : null}
      </UiDialogContent>
    </UiDialog>
  );
};

const CommentEditForm = ({
  comment,
  voxIsOwner,
  busy,
  setBusy,
  onCancel,
  onSave,
}: {
  comment: CommentPublic;
  voxIsOwner: boolean;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onCancel: () => void;
  onSave: Props["onSave"];
}) => {
  const initialStaff = comment.staffBadge != null;
  const initialOp = comment.isOp;
  const [body, setBody] = useState(comment.body);
  const [showStaff, setShowStaff] = useState(initialStaff);
  const [showOp, setShowOp] = useState(initialOp);
  const [saveError, setSaveError] = useState<string | null>(null);

  const trimmed = body.trim();
  const hasOtherContent = Boolean(comment.imageUrl || comment.videoUrl || comment.pollVoteLabel);
  const empty = trimmed.length === 0 && !hasOtherContent;
  const unchanged =
    trimmed === comment.body.trim() &&
    showStaff === initialStaff &&
    (!voxIsOwner || showOp === initialOp);

  const handleSave = async () => {
    setSaveError(null);
    setBusy(true);
    try {
      await onSave(comment.id, {
        body: trimmed,
        showStaffIdentity: showStaff,
        showOpIdentity: voxIsOwner ? showOp : false,
      });
    } catch (e) {
      setSaveError(userFacingApiErrorMessage(e) ?? "No se pudo guardar el comentario.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="space-y-3 py-2">
        <label className="grid gap-1 text-sm text-fg-secondary">
          Texto
          <textarea
            className="max-h-[50vh] min-h-[140px] rounded-md border border-fg/15 bg-surface-sunken px-3 py-2 text-sm text-fg"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={COMMENT_BODY_MAX}
            disabled={busy}
          />
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-fg-secondary">
          <input
            type="checkbox"
            className="mt-0.5 size-3.5 shrink-0 cursor-pointer rounded border-fg/25 accent-brand-500"
            checked={showStaff}
            onChange={(e) => setShowStaff(e.target.checked)}
            disabled={busy}
          />
          <span>Mostrar mi usuario como staff</span>
        </label>
        {voxIsOwner ? (
          <label className="flex cursor-pointer items-start gap-2 text-sm text-fg-secondary">
            <input
              type="checkbox"
              className="mt-0.5 size-3.5 shrink-0 cursor-pointer rounded border-fg/25 accent-brand-500"
              checked={showOp}
              onChange={(e) => setShowOp(e.target.checked)}
              disabled={busy}
            />
            <span>Mostrarme como OP (autor del vox)</span>
          </label>
        ) : null}
        <p className="text-xs text-fg-muted">
          El multimedia y el voto de la encuesta quedan como están. Un &gt;&gt;TAG agregado al
          editar no le avisa al citado.
        </p>
        {saveError ? <p className="text-sm text-danger-400">{saveError}</p> : null}
      </div>
      <UiDialogFooter className="gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
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
    </>
  );
};
