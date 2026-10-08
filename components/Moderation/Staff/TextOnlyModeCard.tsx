"use client";
import { Button } from "@/components/ui/button";
import { useTextOnlyMode } from "@/hooks/moderation/useTextOnlyMode";
import { formatDateTimeEs } from "@/lib/format/dates";
import { cn } from "@/lib/utils";

type Props = {
  isAdmin: boolean;
};

export const TextOnlyModeCard = ({ isAdmin }: Props) => {
  const { state, busy, error, setActive } = useTextOnlyMode();
  const since = state?.since ?? null;
  const active = since !== null;

  return (
    <section
      className={cn(
        "mb-6 rounded-md border p-4",
        active ? "border-warning-500/50 bg-warning-950/30" : "border-fg/10 bg-surface-raised/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-fg-soft">
            Modo «solo texto»{" "}
            {state ? (
              <span className={active ? "text-warning-300" : "text-fg-subtle"}>
                · {active ? `activo desde ${formatDateTimeEs(since)}` : "desactivado"}
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-xs text-fg-subtle">
            Para emergencias, cuando hay un ataque y no da el tiempo para moderar. Mientras está
            activo nadie puede subir imágenes ni videos, ni publicar los que ya había subido: solo
            texto y links de YouTube.
          </p>
        </div>
        {isAdmin && state ? (
          <Button
            type="button"
            size="sm"
            variant={active ? "outline" : "default"}
            disabled={busy}
            className={cn(
              "cursor-pointer",
              !active && "bg-warning-600 text-on-solid hover:bg-warning-500 hover:text-on-solid",
            )}
            onClick={() => void setActive(!active)}
          >
            {busy ? "Guardando…" : active ? "Desactivar" : "Activar"}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="mt-2 text-xs text-danger-400" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
};
