"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatBanRemainingEs,
  type BanApiClientPayload,
} from "@/features/moderation/bannedPayload";
import { DISPLAY_LOCALE } from "@/lib/format/dates";

const formatEnd = (endsAt: string): string => {
  try {
    return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(endsAt));
  } catch {
    return endsAt;
  }
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ban: BanApiClientPayload | null;
};

export const BanBlockedDialog = ({ open, onOpenChange, ban }: Props) => {
  if (!ban) return null;
  const network = ban.scope === "network";
  const remaining = ban.endsAt ? formatBanRemainingEs(ban.endsAt, new Date()) : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-fg/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{network ? "Conexión bloqueada" : "Cuenta baneada"}</DialogTitle>
          <DialogDescription className="space-y-3 text-left text-fg-secondary">
            <p>
              {network
                ? "No se puede publicar desde esta conexión mientras el bloqueo esté vigente."
                : "No podés publicar mientras el ban esté vigente."}
            </p>
            <p>
              <span className="font-medium text-fg">Motivo:</span> {ban.reason}
            </p>
            <p>
              <span className="font-medium text-fg">Duración:</span>{" "}
              {ban.endsAt ? (
                <>
                  hasta el {formatEnd(ban.endsAt)}
                  {remaining ? ` (faltan ${remaining})` : null}
                </>
              ) : (
                "permanente"
              )}
            </p>
            <p className="font-mono text-xs text-fg-muted">
              ID del ban: <span className="text-brand-300">{ban.id}</span>
            </p>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
