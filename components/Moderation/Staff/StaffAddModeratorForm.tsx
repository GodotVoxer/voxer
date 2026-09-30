"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchStaffDirectory, postStaffAddByUsername } from "@/features/moderation/api";
import type { StaffDirectoryUser } from "@/features/moderation/api";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";

type Props = {
  onStaffListUpdate: (users: StaffDirectoryUser[]) => void;
  onAuthRefresh: () => Promise<void>;
};

export const StaffAddModeratorForm = ({ onStaffListUpdate, onAuthRefresh }: Props) => {
  const [staffAddUsername, setStaffAddUsername] = useState("");
  const [staffAddBusy, setStaffAddBusy] = useState(false);
  const [staffAddError, setStaffAddError] = useState<string | null>(null);

  return (
    <div className="rounded-md border border-fg/10 bg-surface-raised/40 p-4">
      <h2 className="mb-1 text-sm font-semibold text-fg-soft">Agregar al staff</h2>
      <p className="mb-3 text-xs text-fg-subtle">
        Escribí el nombre de usuario de una cuenta con rol USER. Pasará a ser moderador (MOD).
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-[180px] flex-1 gap-1 text-xs text-fg-muted">
          Usuario
          <input
            value={staffAddUsername}
            onChange={(e) => {
              setStaffAddUsername(e.target.value);
              setStaffAddError(null);
            }}
            placeholder="ej. maria_lopez"
            className="rounded-md border border-fg/15 bg-surface-sunken px-2 py-2 text-sm text-fg"
          />
        </label>
        <Button
          type="button"
          className="cursor-pointer bg-brand-700 text-on-solid hover:bg-brand-600 hover:text-on-solid"
          disabled={staffAddBusy || !staffAddUsername.trim()}
          onClick={() => {
            void (async () => {
              setStaffAddBusy(true);
              setStaffAddError(null);
              try {
                await postStaffAddByUsername(staffAddUsername.trim());
                setStaffAddUsername("");
                const users = await fetchStaffDirectory();
                onStaffListUpdate(users);
                await onAuthRefresh();
              } catch (error: unknown) {
                setStaffAddError(
                  userFacingApiErrorMessage(error) ?? "No se pudo agregar. Reintentá.",
                );
              } finally {
                setStaffAddBusy(false);
              }
            })();
          }}
        >
          {staffAddBusy ? "Agregando…" : "Agregar como moderador"}
        </Button>
      </div>
      {staffAddError ? <p className="mt-2 text-xs text-danger-400">{staffAddError}</p> : null}
    </div>
  );
};
