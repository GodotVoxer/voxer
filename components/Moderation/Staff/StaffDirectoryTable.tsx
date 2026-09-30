"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AsyncConfirmDialog } from "@/components/Moderation/Dialogs/AsyncConfirmDialog";
import { ModerationInfoDialog } from "@/components/Moderation/Dialogs/ModerationInfoDialog";
import { fetchStaffDirectory, patchUserRole } from "@/features/moderation/api";
import type { StaffDirectoryUser } from "@/features/moderation/api";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";
import type { UserRole } from "@prisma/client";

type StaffUser = {
  id: string;
  role: UserRole;
};

type Props = {
  currentUser: StaffUser;
  isAdmin: boolean;
  staffList: StaffDirectoryUser[];
  onStaffListUpdate: (users: StaffDirectoryUser[]) => void;
  onAuthRefresh: () => Promise<void>;
};

export const StaffDirectoryTable = ({
  currentUser,
  isAdmin,
  staffList,
  onStaffListUpdate,
  onAuthRefresh,
}: Props) => {
  const [removeStaffTarget, setRemoveStaffTarget] = useState<StaffDirectoryUser | null>(null);
  const removeStaffRef = useRef<StaffDirectoryUser | null>(null);
  const [rolePatchError, setRolePatchError] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-md border border-fg/10">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-fg/10 bg-surface-raised/80 text-xs uppercase text-fg-muted">
          <tr>
            <th className="p-2">Usuario</th>
            <th className="p-2">Rol</th>
            {isAdmin ? <th className="p-2">Cambiar</th> : null}
          </tr>
        </thead>
        <tbody>
          {staffList.map((staffRow) => {
            const roleSelectDisabled =
              staffRow.id === currentUser.id ||
              (staffRow.role === "ADMIN" && staffRow.id !== currentUser.id);

            return (
              <tr key={staffRow.id} className="border-b border-fg/5">
                <td className="p-2">{staffRow.username}</td>
                <td className="p-2 font-mono text-xs">{staffRow.role}</td>
                {isAdmin ? (
                  <td className="p-2">
                    {roleSelectDisabled ? (
                      <span
                        className="text-xs text-fg-subtle"
                        title={
                          staffRow.id === currentUser.id
                            ? "No podés cambiar tu propio rol desde acá"
                            : "No podés modificar el rol de otro administrador"
                        }
                      >
                        —
                      </span>
                    ) : (
                      <div className="flex flex-col items-start gap-2">
                        <select
                          defaultValue={staffRow.role}
                          onChange={(event) => {
                            const role = event.target.value as "USER" | "MOD" | "ADMIN";
                            void (async () => {
                              try {
                                await patchUserRole(staffRow.id, role);
                                const users = await fetchStaffDirectory();
                                onStaffListUpdate(users);
                                await onAuthRefresh();
                              } catch (e) {
                                event.target.value = staffRow.role;
                                setRolePatchError(
                                  userFacingApiErrorMessage(e) ?? "No se pudo actualizar el rol.",
                                );
                              }
                            })();
                          }}
                          className="rounded border border-fg/15 bg-surface-sunken px-2 py-1 text-xs text-fg"
                        >
                          <option value="USER">USER</option>
                          <option value="MOD">MOD</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        {staffRow.role === "MOD" && staffRow.id !== currentUser.id ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="cursor-pointer border-danger-800/60 text-xs text-danger-300 hover:bg-danger-950/40"
                            disabled={removeStaffTarget?.id === staffRow.id}
                            onClick={() => {
                              removeStaffRef.current = staffRow;
                              setRemoveStaffTarget(staffRow);
                            }}
                          >
                            Quitar del staff
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!isAdmin ? (
        <p className="p-3 text-xs text-fg-subtle">
          Solo administradores pueden cambiar roles. Como moderador podés ver esta lista.
        </p>
      ) : null}

      <AsyncConfirmDialog
        open={removeStaffTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            removeStaffRef.current = null;
            setRemoveStaffTarget(null);
          }
        }}
        title="Quitar del staff"
        description={
          removeStaffTarget
            ? `¿Sacar a ${removeStaffTarget.username} del staff? Volverá a ser usuario normal (USER).`
            : ""
        }
        confirmLabel="Quitar del staff"
        cancelLabel="Cancelar"
        successMessage="Rol actualizado."
        onConfirm={async () => {
          const u = removeStaffRef.current;
          if (!u) return;
          await patchUserRole(u.id, "USER");
          const users = await fetchStaffDirectory();
          onStaffListUpdate(users);
          await onAuthRefresh();
        }}
      />

      <ModerationInfoDialog
        open={rolePatchError !== null}
        onOpenChange={(o) => {
          if (!o) setRolePatchError(null);
        }}
        title="Cambio de rol"
        message={rolePatchError ?? ""}
      />
    </div>
  );
};
