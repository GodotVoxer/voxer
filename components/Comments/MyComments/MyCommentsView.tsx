"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { MyCommentsVirtualList } from "@/components/Comments/MyComments/MyCommentsVirtualList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth/store";
import { fetchMyComments } from "@/features/comments/api";
import type { MyCommentItem } from "@/lib/comments/myCommentsTypes";
import { MY_COMMENTS_SEARCH_MAX } from "@/lib/limits";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";

const SEARCH_DEBOUNCE_MS = 300;

export const MyCommentsView = () => {
  const username = useAuthStore((state) => state.user?.username ?? null);
  const authLoading = useAuthStore((state) => state.loading);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);
  const [resolvedUsername, setResolvedUsername] = useState<string | null>(null);
  const [items, setItems] = useState<MyCommentItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);
  const loadMoreAbortRef = useRef<AbortController | null>(null);

  const normalizedInput = searchInput.trim();

  useEffect(() => {
    const timeout = window.setTimeout(() => setQuery(normalizedInput), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [normalizedInput]);

  useEffect(() => {
    loadMoreAbortRef.current?.abort();
    loadingMoreRef.current = false;
    if (!username) return;

    const controller = new AbortController();
    void (async () => {
      try {
        const page = await fetchMyComments({ query, signal: controller.signal });
        if (controller.signal.aborted) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        setError(null);
        setResolvedQuery(query);
        setResolvedUsername(username);
        setLoadingMore(false);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setItems([]);
        setNextCursor(null);
        setHasMore(false);
        setError(userFacingApiErrorMessage(caught) ?? "No se pudieron cargar tus comentarios.");
        setResolvedQuery(query);
        setResolvedUsername(username);
        setLoadingMore(false);
      }
    })();
    return () => controller.abort();
  }, [query, username]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !nextCursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;
    try {
      const page = await fetchMyComments({ cursor: nextCursor, query, signal: controller.signal });
      if (controller.signal.aborted) return;
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(userFacingApiErrorMessage(caught) ?? "No se pudieron cargar más comentarios.");
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
      if (loadMoreAbortRef.current === controller) loadMoreAbortRef.current = null;
      loadingMoreRef.current = false;
    }
  }, [nextCursor, query]);

  if (authLoading) return <p className="py-10 text-center text-sm text-fg-subtle">Cargando…</p>;
  if (!username) {
    return (
      <p className="py-10 text-center text-sm text-fg-muted">
        Iniciá sesión para ver tus comentarios.
      </p>
    );
  }

  const loadingResults =
    normalizedInput !== query || resolvedQuery !== query || resolvedUsername !== username;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
          aria-hidden
        />
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar en tus comentarios…"
          aria-label="Buscar en tus comentarios"
          maxLength={MY_COMMENTS_SEARCH_MAX}
          autoComplete="off"
          className="border-fg/20 bg-surface-sunken pr-10 pl-9 text-fg placeholder:text-fg-subtle"
        />
        {searchInput ? (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-fg-muted hover:bg-fg/10 hover:text-fg"
            aria-label="Limpiar búsqueda"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {loadingResults ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-fg-subtle">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          {normalizedInput ? "Buscando…" : "Cargando…"}
        </div>
      ) : error && items.length === 0 ? (
        <p className="py-10 text-center text-sm text-danger-400">{error}</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-fg-muted">
          {query
            ? "No encontramos comentarios que contengan ese texto."
            : "Todavía no comentaste en ningún vox."}
        </p>
      ) : (
        <>
          <MyCommentsVirtualList
            items={items}
            hasMore={hasMore && !error}
            loadingMore={loadingMore}
            loadMore={loadMore}
          />
          {error ? (
            <div className="flex flex-col items-center gap-2 pb-4">
              <p className="text-center text-sm text-danger-400">{error}</p>
              <Button type="button" variant="outline" onClick={() => void loadMore()}>
                Reintentar
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
