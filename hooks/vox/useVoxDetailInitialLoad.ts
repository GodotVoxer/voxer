import { useCallback, useEffect, useRef, useState } from "react";
import { getVoxById, getVoxPollById } from "@/features/vox/api";
import { loadAllCommentsForVox } from "@/features/comments/loadAll";
import type { CommentPublic, VoxDetail } from "@/lib/vox/types";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";
import { cacheComments, readCachedComments } from "@/features/comments/cache";

const hasServerVox = (voxId: string, initialVox?: VoxDetail | null) =>
  initialVox != null && initialVox.id === voxId;

export const useVoxDetailInitialLoad = (voxId: string, initialVox?: VoxDetail | null) => {
  const serverVox: VoxDetail | null = hasServerVox(voxId, initialVox) ? (initialVox ?? null) : null;
  const [initialCachedComments] = useState<CommentPublic[] | null>(() => readCachedComments(voxId));

  const [vox, setVox] = useState<VoxDetail | null>(() => serverVox);
  const [comments, setComments] = useState<CommentPublic[]>(() => initialCachedComments ?? []);
  const [commentsLoading, setCommentsLoading] = useState(initialCachedComments === null);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryGeneration, setRetryGeneration] = useState(0);
  const commentsLoadedRef = useRef(initialCachedComments !== null);

  useEffect(() => {
    cacheComments(voxId, comments);
  }, [comments, voxId]);

  const reloadComments = useCallback(async () => {
    setCommentsError(null);
    if (!commentsLoadedRef.current) setCommentsLoading(true);
    try {
      const list = await loadAllCommentsForVox(voxId);
      setComments(list);
    } catch (e) {
      setComments([]);
      setCommentsError(userFacingApiErrorMessage(e) ?? "No se pudieron cargar los comentarios.");
    } finally {
      commentsLoadedRef.current = true;
      setCommentsLoading(false);
    }
  }, [voxId]);

  const reloadVox = useCallback(async () => {
    try {
      const loaded = await getVoxById(voxId);
      setVox(loaded);
    } catch (e) {
      setLoadError(userFacingApiErrorMessage(e) ?? "Error al cargar el vox");
    }
  }, [voxId]);

  const retryAfterLoadError = useCallback(() => {
    setLoadError(null);
    setRetryGeneration((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const useServerVox = retryGeneration === 0 && serverVox != null;

    void (async () => {
      setCommentsLoading(initialCachedComments === null);

      if (!useServerVox) {
        try {
          const loadedVox = await getVoxById(voxId);
          if (cancelled) return;
          setVox(loadedVox);
        } catch (e) {
          if (!cancelled) {
            setLoadError(userFacingApiErrorMessage(e) ?? "Error al cargar el vox");
            setComments([]);
            setCommentsLoading(false);
          }
          return;
        }
      }

      try {
        const list = await loadAllCommentsForVox(voxId);
        if (!cancelled) setComments(list);
      } catch (e) {
        if (!cancelled) {
          setComments([]);
          setCommentsError(
            userFacingApiErrorMessage(e) ?? "No se pudieron cargar los comentarios.",
          );
        }
      } finally {
        if (!cancelled) {
          commentsLoadedRef.current = true;
          setCommentsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialCachedComments, voxId, retryGeneration, serverVox]);

  useEffect(() => {
    if (!vox?.hasPoll || vox.poll != null) return;
    let cancelled = false;
    void (async () => {
      try {
        const poll = await getVoxPollById(vox.id);
        if (cancelled) return;
        setVox((prev) =>
          prev && prev.id === vox.id ? { ...prev, poll: poll ?? prev.poll } : prev,
        );
      } catch {
        /* keep poll null: the bar stays hidden until a reload */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vox]);

  return {
    vox,
    setVox,
    comments,
    setComments,
    commentsLoading,
    commentsError,
    loadError,
    setLoadError,
    reloadComments,
    reloadVox,
    retryAfterLoadError,
  };
};
