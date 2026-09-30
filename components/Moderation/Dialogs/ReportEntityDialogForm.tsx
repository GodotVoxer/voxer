"use client";
import type { ReportReason } from "@prisma/client";
import { AlertCircle, Loader2 } from "lucide-react";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { REPORT_DETAILS_MAX } from "@/lib/limits";
import { reportReasonLabelEs } from "@/lib/moderation/reportReasonLabels";

type Props = {
  voxTitle: string;
  commentId?: string | null;
  reasons: ReportReason[];
  reason: ReportReason;
  onReasonChange: (reason: ReportReason) => void;
  details: string;
  onDetailsChange: (details: string) => void;
  err: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
};

export const ReportEntityDialogForm = ({
  voxTitle,
  commentId,
  reasons,
  reason,
  onReasonChange,
  details,
  onDetailsChange,
  err,
  submitting,
  onCancel,
  onSubmit,
}: Props) => {
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (submitting) return;
        onSubmit();
      }}
    >
      <DialogHeader>
        <DialogTitle>Denunciar</DialogTitle>
        <DialogDescription className="text-fg-muted">
          {commentId
            ? `Comentario en «${voxTitle}». Elegí el motivo principal.`
            : `Vox «${voxTitle}». Elegí el motivo principal.`}
        </DialogDescription>
      </DialogHeader>
      <fieldset disabled={submitting} className="space-y-3 py-1">
        <div className="space-y-2">
          <label htmlFor="report-reason" className="text-sm text-fg-secondary">
            Motivo
          </label>
          <select
            id="report-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value as ReportReason)}
            className="w-full rounded-md border border-fg/15 bg-surface-sunken px-2 py-2 text-sm text-fg disabled:opacity-60"
          >
            {reasons.map((r) => (
              <option key={r} value={r}>
                {reportReasonLabelEs(r)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="report-details" className="text-sm text-fg-secondary">
              Detalle (opcional)
            </label>
            <span className="text-xs text-fg-subtle">
              {details.length}/{REPORT_DETAILS_MAX}
            </span>
          </div>
          <textarea
            id="report-details"
            value={details}
            placeholder="Aclaración breve para los moderadores…"
            onChange={(e) => onDetailsChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              if (e.shiftKey) return;
              if (e.nativeEvent.isComposing) return;
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }}
            className="min-h-[72px] w-full rounded-md border border-fg/15 bg-surface-sunken px-2 py-2 text-sm text-fg placeholder:text-fg-subtle disabled:opacity-60"
            maxLength={REPORT_DETAILS_MAX}
          />
        </div>
        {err ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-danger-500/30 bg-danger-950/40 px-2 py-2 text-sm text-danger-300"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger-400" aria-hidden />
            <span>{err}</span>
          </div>
        ) : null}
      </fieldset>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer border-fg/20"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="cursor-pointer bg-warning-700 text-on-solid hover:bg-warning-600"
          disabled={submitting}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Enviando…
            </span>
          ) : err ? (
            "Reintentar"
          ) : (
            "Enviar denuncia"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
};
