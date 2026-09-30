"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
import { AuthorBanSection } from "@/components/Moderation/Dialogs/AuthorBanSection";
import { ModerationPlanSummary } from "@/components/Moderation/Dialogs/ModerationPlanSummary";
import { PublicationFatePicker } from "@/components/Moderation/Dialogs/PublicationFatePicker";
import type { StaffPublicationModTarget } from "@/features/moderation/types";
import {
  usePublicationModeration,
  type PublicationModerationResult,
} from "@/hooks/moderation/usePublicationModeration";

export type { PublicationModerationResult };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: StaffPublicationModTarget | null;
  /** Called with what was actually applied, also when a later step failed. */
  onCompleted: (result: PublicationModerationResult) => void | Promise<void>;
};

const targetKey = (target: StaffPublicationModTarget): string =>
  target.kind === "vox" ? `vox:${target.voxId}` : `comment:${target.commentId}`;

const CLOSE_AFTER_SUCCESS_MS = 650;

type SectionProps = { step: number; title: string; children: ReactNode };

const Section = ({ step, title, children }: SectionProps) => (
  <section className="grid gap-2">
    <h3 className="flex items-center gap-2 text-sm font-medium text-fg">
      <span className="flex size-5 items-center justify-center rounded-full bg-surface-elevated text-[11px] text-fg-muted tabular-nums">
        {step}
      </span>
      {title}
    </h3>
    {children}
  </section>
);

type PanelProps = {
  target: StaffPublicationModTarget;
  onClose: () => void;
  onCompleted: Props["onCompleted"];
};

/** All state lives here and the panel only mounts with the dialog open, so every opening starts clean. */
const PublicationModerationPanel = ({ target, onClose, onCompleted }: PanelProps) => {
  const form = usePublicationModeration({ target, onCompleted });
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!form.done) return;
    const t = window.setTimeout(() => onCloseRef.current(), CLOSE_AFTER_SUCCESS_MS);
    return () => window.clearTimeout(t);
  }, [form.done]);

  const locked = form.busy || form.done;

  return (
    <DialogContent
      className="max-h-[90dvh] overflow-y-auto border-fg/10 sm:max-w-lg"
      showClose={!locked}
      onEscapeKeyDown={(e) => {
        if (locked) e.preventDefault();
      }}
      onInteractOutside={(e) => {
        if (locked) e.preventDefault();
      }}
    >
      <DialogHeader>
        <DialogTitle>{target.kind === "vox" ? "Moderar vox" : "Moderar comentario"}</DialogTitle>
        <DialogDescription className="text-fg-muted">
          Elegí qué hacer con la publicación y, si hace falta, con su autor. Todo se aplica junto al
          confirmar.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 py-1">
        <Section step={1} title="La publicación">
          <PublicationFatePicker
            kind={target.kind}
            value={form.fate}
            onChange={form.chooseFate}
            canBlock={form.canBlockMedia}
            disabled={locked}
          />
        </Section>

        <Section step={2} title="El autor">
          <AuthorBanSection
            owner={form.owner}
            enabled={form.banEnabled}
            onEnabledChange={form.toggleBan}
            draft={form.banDraft}
            onDraftChange={form.updateBanDraft}
            disabled={locked}
          />
        </Section>

        <ModerationPlanSummary lines={form.summaryLines} />

        {form.error ? <p className="text-sm text-danger-400">{form.error}</p> : null}
        {form.done ? <p className="text-sm font-medium text-success-400">Listo.</p> : null}
      </div>

      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          disabled={locked}
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          className="cursor-pointer bg-danger-900/90 text-fg hover:bg-danger-800"
          disabled={locked || form.nothingChosen}
          onClick={() => void form.submit()}
        >
          {form.busy ? (
            <>
              <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden />
              Aplicando…
            </>
          ) : form.done ? (
            "Hecho"
          ) : (
            form.confirmLabel
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export const PublicationStaffModerationDialog = ({
  open,
  onOpenChange,
  target,
  onCompleted,
}: Props) => (
  <Dialog open={open && target !== null} onOpenChange={onOpenChange}>
    {open && target ? (
      <PublicationModerationPanel
        key={targetKey(target)}
        target={target}
        onClose={() => onOpenChange(false)}
        onCompleted={onCompleted}
      />
    ) : null}
  </Dialog>
);
