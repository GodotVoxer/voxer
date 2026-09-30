import { startTransition, useCallback, useEffect, useState } from "react";
import { fetchStaffDirectory, type StaffDirectoryUser } from "@/features/moderation/api";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";

export const useModerationStaffDirectory = (enabled: boolean) => {
  const [staffList, setStaffList] = useState<StaffDirectoryUser[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const users = await fetchStaffDirectory();
      setStaffList(users);
    } catch (e) {
      setStaffList([]);
      setLoadError(userFacingApiErrorMessage(e) ?? "No se pudo cargar el directorio de staff.");
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    startTransition(() => {
      void reload();
    });
  }, [enabled, reload]);

  return { staffList, setStaffList, reload, directoryLoadError: loadError };
};
