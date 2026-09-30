"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichGreentextLinkBlock } from "@/components/Comments/Comment/RichGreentextLinkBlock";
import {
  PublicationStaffModerationDialog,
  type PublicationModerationResult,
} from "@/components/Moderation/Dialogs/PublicationStaffModerationDialog";
import { fetchModerationAuthorPublications } from "@/features/moderation/api";
import type { ModerationAuthorPublicationItem } from "@/lib/moderation/authorPublicationsTypes";
import type { StaffPublicationModTarget } from "@/features/moderation/types";
import { cn } from "@/lib/utils";
import { TimestampWithTooltip } from "@/components/Time/TimestampWithTooltip";
import { moderationAuthorPublicationCommentThumbSrc } from "@/features/moderation/authorPublicationCommentMedia";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";
import { voxCommentPath, voxPath } from "@/lib/vox/paths";

const itemMatchesTarget = (
  item: ModerationAuthorPublicationItem,
  target: StaffPublicationModTarget,
): boolean => {
  if (target.kind === "vox") {
    return item.kind === "vox" && item.id === target.voxId;
  }
  return item.kind === "comment" && item.id === target.commentId;
};

const itemToTarget = (item: ModerationAuthorPublicationItem): StaffPublicationModTarget =>
  item.kind === "vox"
    ? { kind: "vox", voxId: item.id }
    : { kind: "comment", voxId: item.voxId, commentId: item.id };

type Props = {
  voxId: string | null;
  commentId: string | null;
};

export const AuthorPublicationsHistoryView = ({ voxId, commentId }: Props) => {
  const [authorLinked, setAuthorLinked] = useState(true);
  const [items, setItems] = useState<ModerationAuthorPublicationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modOpen, setModOpen] = useState(false);
  const [modTarget, setModTarget] = useState<StaffPublicationModTarget | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  const loadFirst = useCallback(async () => {
    setLoadingInitial(true);
    setError(null);
    setItems([]);
    setNextCursor(null);
    try {
      const data = await fetchModerationAuthorPublications({
        voxId: voxId ?? undefined,
        commentId: commentId ?? undefined,
        limit: 20,
      });
      setAuthorLinked(data.authorLinked);
      setItems(data.items);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(userFacingApiErrorMessage(e) ?? "No se pudo cargar el historial.");
    } finally {
      setLoadingInitial(false);
    }
  }, [voxId, commentId]);

  useEffect(() => {
    startTransition(() => {
      void loadFirst();
    });
  }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMoreRef.current || loadingInitial) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);
    try {
      const data = await fetchModerationAuthorPublications({
        voxId: voxId ?? undefined,
        commentId: commentId ?? undefined,
        cursor: nextCursor,
        limit: 20,
      });
      setItems((prev) => {
        const seen = new Set(prev.map((x) => `${x.kind}:${x.id}`));
        const merged = [...prev];
        for (const it of data.items) {
          const k = `${it.kind}:${it.id}`;
          if (!seen.has(k)) {
            seen.add(k);
            merged.push(it);
          }
        }
        return merged;
      });
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(userFacingApiErrorMessage(e) ?? "No se pudieron cargar más publicaciones.");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [nextCursor, voxId, commentId, loadingInitial]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { root: null, rootMargin: "240px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, nextCursor, items.length]);

  const openMod = useCallback((item: ModerationAuthorPublicationItem) => {
    setModTarget(itemToTarget(item));
    setModOpen(true);
  }, []);

  const onModerationCompleted = useCallback(
    async ({ target, deletedPublication }: PublicationModerationResult) => {
      if (deletedPublication) {
        setItems((prev) => prev.filter((x) => !itemMatchesTarget(x, target)));
      }
      await loadFirst();
    },
    [loadFirst],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">Historial de publicaciones</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Solo se muestran datos de contenido público; no se expone identidad real ni nombre de
          usuario.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-danger-900/50 bg-danger-950/30 px-3 py-2 text-sm text-danger-200">
          {error}
        </p>
      ) : null}

      {loadingInitial ? (
        <p className="text-sm text-fg-muted">Cargando…</p>
      ) : !authorLinked ? (
        <p className="text-sm text-warning-200/90">
          Esta publicación no tiene una cuenta de usuario vinculada: no hay historial que listar.
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-fg-muted">No hay publicaciones registradas para esta cuenta.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const commentThumbSrc =
              item.kind === "comment" ? moderationAuthorPublicationCommentThumbSrc(item) : null;
            const thumbSrc =
              item.kind === "vox" ? (item.thumbnailUrl ?? "/video-thumb.svg") : commentThumbSrc;
            const detailHref =
              item.kind === "vox" ? voxPath(item.id) : voxCommentPath(item.voxId, item.publicTag);
            const detailLabel = item.kind === "vox" ? "Ver vox" : "Ver comentario";

            return (
              <li
                key={`${item.kind}:${item.id}`}
                className={cn(
                  "rounded-lg border border-fg/10 bg-surface-sunken/50 p-3",
                  thumbSrc != null && "sm:flex sm:gap-3",
                )}
              >
                {thumbSrc != null ? (
                  <div className="relative mx-auto mb-2 aspect-square w-full max-w-[140px] shrink-0 overflow-hidden rounded-md bg-media-placeholder sm:mx-0 sm:mb-0 sm:size-28">
                    <ThumbImage src={thumbSrc} alt="" remote={thumbSrc.startsWith("http")} />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-semibold uppercase",
                        item.kind === "vox"
                          ? "bg-brand-900/50 text-brand-200"
                          : "bg-special-900/50 text-special-200",
                      )}
                    >
                      {item.kind === "vox" ? "Vox" : "Comentario"}
                    </span>
                    <span className="rounded border border-fg/10 px-1.5 py-0.5 font-mono text-[11px] text-fg-secondary">
                      {item.category}
                    </span>
                    <TimestampWithTooltip iso={item.createdAt} className="ml-auto tabular-nums" />
                  </div>
                  {item.kind === "vox" ? (
                    <>
                      <p className="mt-1 line-clamp-2 text-base font-semibold text-fg">
                        {item.title}
                      </p>
                      <RichGreentextLinkBlock
                        text={item.description}
                        className="mt-1 line-clamp-4 break-words text-sm text-fg-secondary"
                      />
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-xs text-fg-subtle">En vox: {item.voxTitle}</p>
                      <p className="mt-1 line-clamp-4 text-sm text-fg-soft">{item.bodyPreview}</p>
                    </>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="cursor-pointer border-fg/20 text-fg-bright hover:bg-surface-elevated"
                      asChild
                    >
                      <Link href={detailHref} className="inline-flex items-center gap-1">
                        <ExternalLink className="size-3.5" aria-hidden />
                        {detailLabel}
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="cursor-pointer border-danger-800/60 text-danger-100 hover:bg-danger-950/40"
                      onClick={() => openMod(item)}
                    >
                      <Hammer className="mr-1 size-3.5" aria-hidden />
                      Moderar
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {authorLinked && nextCursor ? (
        <div
          ref={sentinelRef}
          className="flex h-8 items-center justify-center text-xs text-fg-subtle"
        >
          {loadingMore ? "Cargando más…" : ""}
        </div>
      ) : null}

      <PublicationStaffModerationDialog
        open={modOpen}
        onOpenChange={(open) => {
          setModOpen(open);
          if (!open) setModTarget(null);
        }}
        target={modTarget}
        onCompleted={onModerationCompleted}
      />
    </div>
  );
};

const ThumbImage = ({ src, alt, remote }: { src: string; alt: string; remote: boolean }) => {
  if (remote) {
    // eslint-disable-next-line @next/next/no-img-element -- URLs remotas arbitrarias.
    return <img src={src} alt={alt} className="h-full w-full object-cover" />;
  }
  return (
    <Image src={src} alt={alt} fill className="object-cover" sizes="112px" unoptimized={remote} />
  );
};
