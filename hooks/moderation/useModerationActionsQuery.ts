import { useCallback, useEffect, useRef, useState } from "react";
import { fetchModerationActions, type ModerationActionRow } from "@/features/moderation/api";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";

export const MODERATION_SEARCH_DEBOUNCE_MS = 300;

type Args = {
  moderatorUsername: string;
  banIdFilter: string;
  debounceMs?: number;
};

export const useModerationActionsQuery = ({
  moderatorUsername,
  banIdFilter,
  debounceMs = MODERATION_SEARCH_DEBOUNCE_MS,
}: Args) => {
  const [actions, setActions] = useState<ModerationActionRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState<string | null>(null);

  const activeFiltersRef = useRef({ actorUsername: "", banId: "" });
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMountRef = useRef(true);

  const runQuery = useCallback(
    async (filters: { moderatorUsername: string; banIdFilter: string }) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const actorUsername = filters.moderatorUsername.trim() || undefined;
      const banId = filters.banIdFilter.trim() || undefined;

      setLoading(true);
      setQueryError(null);

      try {
        const { actions: rows, nextCursor: cursor } = await fetchModerationActions({
          actorUsername,
          banId,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        activeFiltersRef.current = {
          actorUsername: actorUsername ?? "",
          banId: banId ?? "",
        };
        setActions(rows);
        setNextCursor(cursor);
      } catch (e) {
        if (controller.signal.aborted) return;
        setActions([]);
        setNextCursor(null);
        setQueryError(
          userFacingApiErrorMessage(e) ?? "No se pudo cargar el historial de moderación.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    await runQuery({ moderatorUsername, banIdFilter });
  }, [moderatorUsername, banIdFilter, runQuery]);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      void runQuery({ moderatorUsername, banIdFilter });
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void runQuery({ moderatorUsername, banIdFilter });
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [moderatorUsername, banIdFilter, debounceMs, runQuery]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  const appendNextPage = useCallback(async () => {
    if (!nextCursor) return;
    setQueryError(null);
    try {
      const { actions: more, nextCursor: cursor } = await fetchModerationActions({
        cursor: nextCursor,
        actorUsername: activeFiltersRef.current.actorUsername || undefined,
        banId: activeFiltersRef.current.banId || undefined,
      });
      setActions((prev) => [...prev, ...more]);
      setNextCursor(cursor);
    } catch (e) {
      setQueryError(userFacingApiErrorMessage(e) ?? "No se pudieron cargar más acciones.");
    }
  }, [nextCursor]);

  return {
    actions,
    nextCursor,
    loading,
    queryError,
    refresh,
    appendNextPage,
  };
};
