"use client";
import Link from "next/link";
import { ChevronDown, Eye, Hammer, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type Props = {
  voxId: string;
  /** Only an admin on their own vox; other staff do not see the button. */
  canEditOwnVox: boolean;
  onOpenModerateVox: () => void;
  onOpenEditVox: () => void;
  onOpenRecategorize: () => void;
};

export const VoxDetailStaffActionBar = ({
  voxId,
  canEditOwnVox,
  onOpenModerateVox,
  onOpenEditVox,
  onOpenRecategorize,
}: Props) => {
  const historyHref = `/moderacion/historial-publicaciones?voxId=${encodeURIComponent(voxId)}`;
  const historyTitle = "Historial del autor (staff)";

  return (
    <Collapsible
      defaultOpen={false}
      className="rounded-md border border-danger-900/40 bg-danger-950/20"
    >
      <CollapsibleTrigger
        type="button"
        className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-2 text-left outline-none hover:bg-danger-950/35 focus-visible:ring-2 focus-visible:ring-danger-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-sunken"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-danger-200/90">
          Moderación
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-danger-200/80 transition-transform duration-200 group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-wrap gap-2 border-t border-danger-900/30 px-2 pb-2 pt-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="cursor-pointer border-danger-800/60 text-danger-100 hover:bg-danger-950/50"
            onClick={onOpenModerateVox}
          >
            <Hammer className="mr-1 inline size-4 align-text-bottom" aria-hidden />
            Moderar vox
          </Button>
          {canEditOwnVox ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer border-brand-900/45 bg-surface-raised text-brand-200 hover:bg-brand-950/40 hover:text-brand-100"
              onClick={onOpenEditVox}
            >
              <Pencil className="mr-1 inline size-4 align-text-bottom" aria-hidden />
              Editar vox
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="cursor-pointer border-warning-900/40 bg-surface-raised text-warning-100 hover:bg-warning-950/40 hover:text-fg"
            onClick={onOpenRecategorize}
          >
            Recategorizar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="cursor-pointer border-caution-800/50 bg-surface-raised text-caution-400 hover:bg-caution-950/40 hover:text-caution-300"
            asChild
          >
            <Link href={historyHref} title={historyTitle}>
              <Eye className="mr-1 inline size-4 align-text-bottom" strokeWidth={2} aria-hidden />
              Historial
            </Link>
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
