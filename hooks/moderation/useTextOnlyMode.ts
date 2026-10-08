import { startTransition, useCallback, useEffect, useState } from "react";
import {
  fetchTextOnlyMode,
  putTextOnlyMode,
  type TextOnlyModeState,
} from "@/features/moderation/api";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";

export const useTextOnlyMode = () => {
  const [state, setState] = useState<TextOnlyModeState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      void fetchTextOnlyMode()
        .then(setState)
        .catch((e: unknown) => {
          setError(userFacingApiErrorMessage(e) ?? "No se pudo cargar el modo «solo texto».");
        });
    });
  }, []);

  const setActive = useCallback(async (active: boolean) => {
    setBusy(true);
    setError(null);
    try {
      setState(await putTextOnlyMode(active));
    } catch (e) {
      setError(userFacingApiErrorMessage(e) ?? "No se pudo cambiar el modo. Reintentá.");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, error, setActive };
};
