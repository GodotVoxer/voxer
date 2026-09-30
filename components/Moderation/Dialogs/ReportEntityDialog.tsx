"use client";
import { useEffect, useRef, useState } from "react";
import type { ReportReason } from "@prisma/client";
import { ReportReason as ReportReasonEnum } from "@prisma/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { postReport } from "@/features/moderation/api";
import { ReportEntityDialogForm } from "@/components/Moderation/Dialogs/ReportEntityDialogForm";
import { ReportEntityDialogSuccess } from "@/components/Moderation/Dialogs/ReportEntityDialogSuccess";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";

const REASONS: ReportReason[] = [
  ReportReasonEnum.WRONG_CATEGORY,
  ReportReasonEnum.NSFW_OUT_OF_CATEGORY,
  ReportReasonEnum.GORE,
  ReportReasonEnum.SPAM,
  ReportReasonEnum.ILLEGAL_CONTENT,
  ReportReasonEnum.OTHER,
];

const SUCCESS_AUTO_CLOSE_MS = 1600;

type Phase = "idle" | "submitting" | "success";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voxId: string;
  voxTitle: string;
  commentId?: string | null;
};

export const ReportEntityDialog = ({ open, onOpenChange, voxId, voxTitle, commentId }: Props) => {
  const [reason, setReason] = useState<ReportReason>(ReportReasonEnum.WRONG_CATEGORY);
  const [details, setDetails] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [err, setErr] = useState<string | null>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const submitting = phase === "submitting";
  const succeeded = phase === "success";

  const clearAutoCloseTimer = () => {
    if (autoCloseTimerRef.current !== null) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  };

  const reset = () => {
    clearAutoCloseTimer();
    setReason(ReportReasonEnum.WRONG_CATEGORY);
    setDetails("");
    setErr(null);
    setPhase("idle");
  };

  useEffect(() => {
    return () => {
      clearAutoCloseTimer();
    };
  }, []);

  const submit = () => {
    void (async () => {
      setPhase("submitting");
      setErr(null);
      try {
        await postReport({
          voxId,
          commentId: commentId ?? undefined,
          reason,
          details: details.trim() || undefined,
        });
        setPhase("success");
        clearAutoCloseTimer();
        autoCloseTimerRef.current = setTimeout(() => {
          autoCloseTimerRef.current = null;
          onOpenChange(false);
        }, SUCCESS_AUTO_CLOSE_MS);
      } catch (e) {
        setErr(userFacingApiErrorMessage(e) ?? "No se pudo enviar la denuncia. Probá de nuevo.");
        setPhase("idle");
      }
    })();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && submitting) return;
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="border-fg/10 sm:max-w-md">
        {succeeded ? (
          <ReportEntityDialogSuccess onClose={() => onOpenChange(false)} />
        ) : (
          <ReportEntityDialogForm
            voxTitle={voxTitle}
            commentId={commentId}
            reasons={REASONS}
            reason={reason}
            onReasonChange={setReason}
            details={details}
            onDetailsChange={setDetails}
            err={err}
            submitting={submitting}
            onCancel={() => onOpenChange(false)}
            onSubmit={submit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
