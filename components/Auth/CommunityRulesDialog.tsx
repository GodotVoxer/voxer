"use client";
import { useState } from "react";
import {
  DropletOff,
  LayoutGrid,
  MessageSquareOff,
  Scale,
  ScrollText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FriendlyError } from "@/components/Shell/FriendlyError";
import {
  persistRulesAcceptance,
  useRulesPromptStore,
  type RulesPromptReason,
} from "@/features/auth/rulesPromptStore";
import { COMMUNITY_RULES, type CommunityRuleId } from "@/lib/auth/communityRules";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";
import { cn } from "@/lib/utils";

const RULE_ICONS: Record<CommunityRuleId, { icon: LucideIcon; tone: string }> = {
  categories: { icon: LayoutGrid, tone: "bg-category-500/15 text-category-300" },
  spam: { icon: MessageSquareOff, tone: "bg-warning-500/15 text-warning-300" },
  law: { icon: Scale, tone: "bg-brand-500/15 text-brand-300" },
  gore: { icon: DropletOff, tone: "bg-danger-500/15 text-danger-300" },
};

const CANCEL_HINT: Record<RulesPromptReason, string> = {
  register: "Si cancelás, no se crea la cuenta.",
  login: "Si cancelás, se cierra la sesión.",
  publish: "Sin aceptarlas no vas a poder comentar ni crear vox.",
};

/** No Escape or outside click: closing without choosing would not say whether the user accepted. */
export const CommunityRulesDialog = () => {
  const reason = useRulesPromptStore((s) => s.reason);
  const settle = useRulesPromptStore((s) => s.settle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keeps the text during the closing animation, when `reason` is already back to null.
  const [lastReason, setLastReason] = useState<RulesPromptReason>("publish");
  if (reason && reason !== lastReason) setLastReason(reason);
  const shownReason = reason ?? lastReason;

  const close = (accepted: boolean) => {
    setError(null);
    settle(accepted);
  };

  const accept = async () => {
    if (shownReason === "register") {
      close(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await persistRulesAcceptance();
      close(true);
    } catch (err: unknown) {
      setError(userFacingApiErrorMessage(err) ?? "No pudimos guardar tu respuesta. Reintentá.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={reason !== null}>
      <DialogContent
        showClose={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="gap-5 sm:max-w-md"
      >
        <DialogHeader>
          <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-brand-500/15 text-brand-300 sm:mx-0">
            <ScrollText className="size-6" aria-hidden />
          </span>
          <DialogTitle className="text-xl leading-snug">Reglas de Voxer</DialogTitle>
          <DialogDescription className="text-fg-secondary">
            Al usar Voxer, aceptás estas reglas:
          </DialogDescription>
        </DialogHeader>

        <ol className="grid gap-2">
          {COMMUNITY_RULES.map((rule) => {
            const { icon: Icon, tone } = RULE_ICONS[rule.id];
            return (
              <li
                key={rule.id}
                className="flex items-center gap-3 rounded-lg border border-fg/10 bg-surface-sunken/80 px-3 py-2.5"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md",
                    tone,
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-fg-bright">{rule.title}</span>
                  <span className="block text-xs text-fg-muted">{rule.detail}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <p className="flex items-center justify-center gap-2 text-sm font-medium text-fg sm:justify-start">
          <Sparkles className="size-4 text-highlight-300" aria-hidden />
          ¡Disfrutá de Voxer!
        </p>

        {error && <FriendlyError size="compact" title="Error" message={error} />}

        <div className="grid gap-3">
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              className="cursor-pointer text-fg-secondary hover:bg-fg/10"
              onClick={() => close(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={busy}
              className="cursor-pointer bg-brand-600 text-on-solid hover:bg-brand-500"
              onClick={() => void accept()}
            >
              {busy ? "Guardando…" : "Aceptar"}
            </Button>
          </DialogFooter>
          <p className="text-center text-xs text-fg-muted sm:text-right">
            {CANCEL_HINT[shownReason]}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
