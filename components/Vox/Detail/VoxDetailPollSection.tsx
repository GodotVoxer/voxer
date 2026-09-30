"use client";
import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { VoxPollPublic } from "@/lib/vox/types";
import { postPollVote } from "@/features/vox/api";
import { useAuthStore } from "@/features/auth/store";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";
import { pollBarHueForSortOrder } from "@/lib/vox/pollBarHue";

type Props = {
  voxId: string;
  poll: VoxPollPublic;
  onPollChange: (next: VoxPollPublic) => void;
  onVoted?: (choice: { optionId: string; label: string; badgeHue: number }) => void;
};

export const VoxDetailPollSection = ({ voxId, poll, onPollChange, onVoted }: Props) => {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const openAuthDialog = useAuthStore((s) => s.openAuthDialog);
  const authUser = useAuthStore((s) => s.user);

  const totalVotes = poll.totalVotes;
  const flexWeights = poll.options.map((opt) => {
    const tally = poll.tallies.find((t) => t.optionId === opt.id);
    const c = tally?.count ?? 0;
    if (totalVotes <= 0) return 1;
    return Math.max(c, totalVotes * 0.04);
  });

  const openDialog = () => {
    setError(null);
    setOpen(true);
  };

  const vote = async (optionId: string, label: string) => {
    if (!authUser) {
      openAuthDialog();
      return;
    }
    if (poll.viewerVoteOptionId) return;
    setBusyId(optionId);
    setError(null);
    try {
      const next = await postPollVote(voxId, optionId);
      onPollChange(next);
      const meta = next.options.find((o) => o.id === optionId);
      onVoted?.({
        optionId,
        label,
        badgeHue: pollBarHueForSortOrder(meta?.sortOrder ?? 0),
      });
      setOpen(false);
    } catch (e: unknown) {
      setError(userFacingApiErrorMessage(e) ?? "No se pudo registrar el voto.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={openDialog}
        className="w-full cursor-pointer rounded-lg border border-fg/10 bg-surface-raised/80 p-2 text-left transition hover:border-brand-500/40 hover:bg-surface-raised"
      >
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
          <BarChart3 className="size-3.5 shrink-0 text-warning-400" aria-hidden />
          Encuesta
          <span className="ml-auto tabular-nums text-fg-subtle">{totalVotes} votos</span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-elevated ring-1 ring-inset ring-fg/10">
          {poll.options.map((opt, i) => {
            const hue = pollBarHueForSortOrder(opt.sortOrder);
            const w = flexWeights[i] ?? 1;
            return (
              <div
                key={opt.id}
                className="min-w-[6px] shrink-0 transition-[flex-grow] duration-300"
                style={{
                  flexGrow: w,
                  backgroundColor: `hsl(${hue} 72% 46%)`,
                }}
                title={opt.label}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] leading-tight">
          {poll.options.map((opt) => {
            const hue = pollBarHueForSortOrder(opt.sortOrder);
            return (
              <span
                key={opt.id}
                className="inline-flex max-w-full min-w-0 items-center gap-1 truncate"
                style={{ color: `hsl(${hue} 80% var(--data-hue-text-l))` }}
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: `hsl(${hue} 72% 50%)` }}
                  aria-hidden
                />
                {opt.label}
              </span>
            );
          })}
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-fg/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Encuesta</DialogTitle>
            <DialogDescription className="text-fg-muted">
              {poll.viewerVoteOptionId
                ? "Resultados. Ya registraste tu voto."
                : "Elegí una opción para votar y ver resultados detallados."}
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-danger-400">{error}</p> : null}
          {!authUser ? <p className="text-xs text-fg-subtle">Iniciá sesión para votar.</p> : null}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-elevated">
            {poll.options.map((opt, i) => {
              const hue = pollBarHueForSortOrder(opt.sortOrder);
              const w = flexWeights[i] ?? 1;
              return (
                <div
                  key={opt.id}
                  className="min-w-[6px] shrink-0"
                  style={{ flexGrow: w, backgroundColor: `hsl(${hue} 72% 46%)` }}
                />
              );
            })}
          </div>
          <ul className="grid gap-2 pt-1">
            {poll.options.map((opt) => {
              const tally = poll.tallies.find((t) => t.optionId === opt.id);
              const count = tally?.count ?? 0;
              const pct = tally?.percent ?? 0;
              const hue = pollBarHueForSortOrder(opt.sortOrder);
              const votedHere = poll.viewerVoteOptionId === opt.id;
              const canVote = !poll.viewerVoteOptionId && authUser;
              return (
                <li key={opt.id}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canVote || busyId !== null}
                    className={cn(
                      "h-auto min-h-11 w-full cursor-pointer justify-between gap-3 border-fg/15 bg-surface-sunken px-3 py-2 text-left text-fg hover:bg-surface-raised",
                      votedHere && "ring-2 ring-warning-400/80",
                    )}
                    style={{ borderLeftWidth: 4, borderLeftColor: `hsl(${hue} 72% 50%)` }}
                    onClick={() => void vote(opt.id, opt.label)}
                  >
                    <span className="min-w-0 flex-1 whitespace-normal break-words">
                      {opt.label}
                    </span>
                    <span className="shrink-0 tabular-nums text-xs text-fg-muted">
                      {count} · {pct.toFixed(2)}%
                    </span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
};
