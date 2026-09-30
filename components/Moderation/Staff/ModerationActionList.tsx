"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AsyncConfirmDialog } from "@/components/Moderation/Dialogs/AsyncConfirmDialog";
import { useAuthStore } from "@/features/auth/store";
import type { ModerationActionRow } from "@/features/moderation/api";
import { undoModerationActionRequest } from "@/features/moderation/api";
import { ModerationActionPreviewDialog } from "@/components/Moderation/Dialogs/ModerationActionPreviewDialog";
import { ModerationActionDetailCell } from "@/components/Moderation/Staff/ModerationActionDetailCell";
import {
  moderationActionLabelEs,
  moderationActionPayloadSummary,
  moderationActionSupportsUndo,
} from "@/features/moderation/actionLabels";
import { canUndoModerationAction } from "@/lib/moderation/roleGuards";
import { formatDateTimeEs } from "@/lib/format/dates";

type Props = {
  actions: ModerationActionRow[];
  loading: boolean;
  nextCursor: string | null;
  onAppendNextPage: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onAuthRefresh: () => Promise<void>;
};

export const ModerationActionList = ({
  actions,
  loading,
  nextCursor,
  onAppendNextPage,
  onRefresh,
  onAuthRefresh,
}: Props) => {
  const viewerRole = useAuthStore((s) => s.user?.role);
  const [undoTarget, setUndoTarget] = useState<ModerationActionRow | null>(null);
  const undoRef = useRef<ModerationActionRow | null>(null);
  const [previewAction, setPreviewAction] = useState<ModerationActionRow | null>(null);

  const viewerMayUndo = (row: ModerationActionRow): boolean =>
    moderationActionSupportsUndo(row.actionType) &&
    viewerRole !== undefined &&
    canUndoModerationAction(viewerRole, row.actorRole, row.actorRole === "ADMIN");

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-fg/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-fg/10 bg-surface-raised/80 text-xs uppercase text-fg-muted">
            <tr>
              <th className="p-2">Fecha</th>
              <th className="p-2">Moderador</th>
              <th className="p-2">Acción</th>
              <th className="p-2">Detalle</th>
              <th className="p-2">Ban ID</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-fg-subtle">
                  Cargando…
                </td>
              </tr>
            ) : actions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-fg-subtle">
                  Sin registros.
                </td>
              </tr>
            ) : (
              actions.map((actionRow) => (
                <tr key={actionRow.id} className="border-b border-fg/5 hover:bg-fg/5">
                  <td className="whitespace-nowrap p-2 text-fg-secondary">
                    {formatDateTimeEs(actionRow.createdAt)}
                  </td>
                  <td className="p-2">{actionRow.actorUsername}</td>
                  <td className="p-2">{moderationActionLabelEs(actionRow.actionType)}</td>
                  <ModerationActionDetailCell
                    actionRow={actionRow}
                    onOpenPreview={setPreviewAction}
                  />
                  <td className="p-2 font-mono text-xs text-brand-300">
                    {actionRow.relatedBanId ?? "—"}
                  </td>
                  <td className="p-2">
                    {actionRow.undoneAt ? (
                      <span className="text-xs text-fg-subtle">Deshecho</span>
                    ) : viewerMayUndo(actionRow) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={undoTarget?.id === actionRow.id}
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          undoRef.current = actionRow;
                          setUndoTarget(actionRow);
                        }}
                      >
                        Deshacer
                      </Button>
                    ) : (
                      <span className="text-xs text-fg-faint">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {nextCursor ? (
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={() => void onAppendNextPage()}
        >
          Cargar más
        </Button>
      ) : null}

      {previewAction ? (
        <ModerationActionPreviewDialog
          key={previewAction.id}
          action={previewAction}
          onClose={() => setPreviewAction(null)}
        />
      ) : null}

      <AsyncConfirmDialog
        open={undoTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            undoRef.current = null;
            setUndoTarget(null);
          }
        }}
        title="Deshacer acción"
        description={
          undoTarget
            ? `${moderationActionLabelEs(undoTarget.actionType)} — ${moderationActionPayloadSummary(undoTarget)}. ¿Deshacer esta acción?`
            : ""
        }
        confirmLabel="Deshacer"
        cancelLabel="Cancelar"
        confirmVariant="destructive"
        successMessage="Acción deshecha."
        onConfirm={async () => {
          const row = undoRef.current;
          if (!row) return;
          await undoModerationActionRequest(row.id);
          await onRefresh();
          await onAuthRefresh();
        }}
      />
    </>
  );
};
