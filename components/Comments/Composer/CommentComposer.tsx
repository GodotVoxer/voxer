"use client";
import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import type { ReplyTagHandler } from "@/components/Comments/Comment/CommentTagButton";
import { Link2, Paperclip, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FriendlyError } from "@/components/Shell/FriendlyError";
import { BanBlockedDialog } from "@/components/Moderation/Dialogs/BanBlockedDialog";
import { CommentLinkAttachDialog } from "@/components/Comments/Composer/CommentLinkAttachDialog";
import { FileDropHintOverlay } from "@/components/FileDrop/FileDropHintOverlay";
import { LocalVideoPreview } from "@/components/Media/LocalVideoPreview";
import { SilentVideoGifOption } from "@/components/Media/SilentVideoGifOption";
import { getFirstClipboardVoxUploadFile } from "@/features/media/uploadClientFiles";
import { appendReplyTagToDraft } from "@/lib/comments/replies";
import { COMMENT_BODY_MAX, COMMENT_REPLY_TAGS_MAX } from "@/lib/limits";
import { useCommentComposer } from "@/hooks/comments/useCommentComposer";
import type { FloatingCommentComposer } from "@/hooks/comments/useFloatingCommentComposer";
import { useFloatingComposerMotion } from "@/hooks/comments/useFloatingComposerMotion";
import { useDropFilesOverlay } from "@/hooks/media/useDropFilesOverlay";
import { useAutoGrowTextarea } from "@/hooks/common/useAutoGrowTextarea";
import type { CommentPublic } from "@/lib/vox/types";
import { commentComposerFocusScrollDelta } from "@/features/comments/composerFocusScroll";
import { useSettingsStore } from "@/features/settings/store";
import {
  commentSubmitShortcutTitle,
  shouldSubmitCommentFromKey,
} from "@/features/comments/submitShortcut";
import { isStaffRole } from "@/lib/moderation/roles";
import { cn } from "@/lib/utils";
import { isTwoColumnLayout } from "@/features/device/mediaQueries";

export type CommentComposerHandle = {
  insertReply: ReplyTagHandler;
};

type Props = {
  voxId: string;
  onPosted: (posted: CommentPublic) => void;
  pendingPollVote?: { optionId: string; label: string; badgeHue: number } | null;
  onDismissPendingPollVote?: () => void;
  floating: FloatingCommentComposer;
};

const primaryBtn = "bg-brand-600 text-on-solid hover:bg-brand-500 shadow-sm";

export const CommentComposer = forwardRef<CommentComposerHandle, Props>(
  ({ voxId, onPosted, pendingPollVote = null, onDismissPendingPollVote, floating }, ref) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const focusScrollCleanupRef = useRef<() => void>(() => undefined);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const touchMovedRef = useRef(false);
    const viewportHeightBeforeFocusRef = useRef<number | null>(null);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const commentSubmitShortcut = useSettingsStore((s) => s.commentSubmitShortcut);

    const composer = useCommentComposer({ voxId, onPosted, pendingPollVote });

    useAutoGrowTextarea(textareaRef, composer.body);

    const setBodyRef = useRef(composer.setBody);
    useEffect(() => {
      setBodyRef.current = composer.setBody;
    }, [composer.setBody]);

    const armFloatingRef = useRef(floating.arm);
    useEffect(() => {
      armFloatingRef.current = floating.arm;
    }, [floating.arm]);

    const panelRef = useRef<HTMLDivElement>(null);
    useFloatingComposerMotion({
      panelRef,
      phase: floating.phase,
      originRef: floating.originRef,
      onClosed: floating.onClosed,
    });

    useEffect(() => () => focusScrollCleanupRef.current(), []);

    const positionFocusedComposerAboveKeyboard = () => {
      focusScrollCleanupRef.current();
      if (isTwoColumnLayout()) return;

      const align = () => {
        const textarea = textareaRef.current;
        if (!textarea || document.activeElement !== textarea) return;
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const heightBeforeFocus = viewportHeightBeforeFocusRef.current;
        if (heightBeforeFocus === null || viewportHeight > heightBeforeFocus - 80) return;
        const rect = textarea.getBoundingClientRect();
        const viewportTop = window.visualViewport?.offsetTop ?? 0;
        const viewportBottom = viewportTop + (window.visualViewport?.height ?? window.innerHeight);
        const delta = commentComposerFocusScrollDelta({
          elementBottom: rect.bottom,
          viewportBottom,
        });
        if (delta !== 0) window.scrollBy({ top: delta, behavior: "smooth" });
      };

      const visualViewport = window.visualViewport;
      visualViewport?.addEventListener("resize", align);
      window.addEventListener("resize", align);
      const keyboardTimers = [300, 650, 1000].map((delay) => window.setTimeout(align, delay));
      const stopTimer = window.setTimeout(() => focusScrollCleanupRef.current(), 1200);

      focusScrollCleanupRef.current = () => {
        keyboardTimers.forEach((timer) => window.clearTimeout(timer));
        window.clearTimeout(stopTimer);
        visualViewport?.removeEventListener("resize", align);
        window.removeEventListener("resize", align);
        focusScrollCleanupRef.current = () => undefined;
      };
    };

    const startMobileTouch = (event: React.TouchEvent<HTMLTextAreaElement>) => {
      if (isTwoColumnLayout() || event.touches.length !== 1) return;
      const touch = event.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      touchMovedRef.current = false;
      viewportHeightBeforeFocusRef.current = window.visualViewport?.height ?? window.innerHeight;
    };

    const trackMobileTouch = (event: React.TouchEvent<HTMLTextAreaElement>) => {
      const start = touchStartRef.current;
      const touch = event.touches[0];
      if (!start || !touch) return;
      if (Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 8) {
        touchMovedRef.current = true;
      }
    };

    const finishMobileTouch = (event: React.TouchEvent<HTMLTextAreaElement>) => {
      const wasTap = touchStartRef.current !== null && !touchMovedRef.current;
      touchStartRef.current = null;
      touchMovedRef.current = false;
      if (!wasTap || document.activeElement === event.currentTarget) return;

      event.preventDefault();
      const textarea = event.currentTarget;
      textarea.focus({ preventScroll: true });
      const end = textarea.value.length;
      textarea.setSelectionRange(end, end);
    };

    useImperativeHandle(
      ref,
      () => ({
        insertReply: (tag, origin) => {
          const upper = tag.toUpperCase();
          flushSync(() => {
            setBodyRef.current((previous) =>
              appendReplyTagToDraft(previous, upper, COMMENT_REPLY_TAGS_MAX),
            );
          });
          armFloatingRef.current(origin);
          requestAnimationFrame(() => {
            const element = textareaRef.current;
            if (!element) return;
            // On touch screens this would open the keyboard over the comment being quoted.
            if (isTwoColumnLayout()) {
              element.focus({ preventScroll: true });
            }
            const length = element.value.length;
            element.setSelectionRange(length, length);
          });
        },
      }),
      [],
    );

    const clearLinkAttachment = () => {
      composer.onLinkChange("", fileRef.current);
    };

    const { showDropOverlay, dropHandlers } = useDropFilesOverlay({
      onDropFile: (file) => composer.onPickFile(file, fileRef.current),
      disabled: composer.busy,
    });

    if (!composer.authLoading && !composer.authUser) {
      return (
        <div className="border-b border-fg/10 bg-surface-sunken/90 p-3 space-y-2 shrink-0">
          <p className="text-sm text-fg-secondary">Iniciá sesión para participar en el vox.</p>
          <Button type="button" className={primaryBtn} onClick={() => composer.openAuthDialog()}>
            Entrar o registrarse
          </Button>
        </div>
      );
    }

    const showPreview =
      Boolean(composer.file && composer.objectUrl) || Boolean(composer.linkPreview.thumb);
    const previewShowVideoTag =
      Boolean(composer.file?.type.startsWith("video/")) || composer.linkPreview.isLocalVideo;
    const previewImgSrc =
      composer.file && composer.objectUrl ? composer.objectUrl : composer.linkPreview.thumb;
    const canShowStaffBadge = composer.authUser !== null && isStaffRole(composer.authUser.role);
    const hasLinkOnly = Boolean(composer.linkUrl.trim()) && !composer.file;
    const linkBtnActive = hasLinkOnly || linkDialogOpen;
    const detached = floating.phase !== "docked";

    return (
      <>
        <BanBlockedDialog
          open={composer.banDialogOpen}
          onOpenChange={composer.setBanDialogOpen}
          ban={composer.banPayload}
        />
        <CommentLinkAttachDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          initialDraft={composer.linkUrl}
          onApply={(trimmed) => composer.onLinkChange(trimmed, fileRef.current)}
          onPasteImageFile={(file) => composer.onPickFile(file, fileRef.current)}
        />

        <div
          ref={panelRef}
          className={cn(
            "relative border-b border-fg/10 bg-surface-sunken/90 p-3 space-y-2 shrink-0",
            detached &&
              "fixed top-[calc(50dvh+var(--app-header-offset)/2)] left-4 z-30 max-h-[calc(100dvh-var(--app-header-offset)-2rem)] w-[calc(50%-2rem)] -translate-y-1/2 overflow-y-auto rounded-lg border bg-surface-sunken shadow-2xl",
          )}
          onKeyDown={
            floating.phase === "open"
              ? (e) => {
                  if (e.key === "Escape" && !e.defaultPrevented) floating.close();
                }
              : undefined
          }
          {...dropHandlers}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-fg-subtle">Nuevo comentario</p>
            {detached ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-my-1 size-7 cursor-pointer text-fg-muted hover:bg-fg/10 hover:text-fg"
                title="Cerrar (Esc)"
                aria-label="Cerrar el cuadro flotante"
                onClick={floating.close}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
          {pendingPollVote && onDismissPendingPollVote ? (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-on-solid shadow-sm"
                style={{
                  backgroundColor: `hsl(${pendingPollVote.badgeHue} 68% 38%)`,
                }}
              >
                <span className="min-w-0 truncate">Voto: {pendingPollVote.label}</span>
                <button
                  type="button"
                  className="shrink-0 cursor-pointer rounded-full p-0.5 hover:bg-fg/15"
                  aria-label="Quitar voto del comentario"
                  title="No mostrar el voto en este comentario"
                  onClick={onDismissPendingPollVote}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </span>
            </div>
          ) : null}
          {showPreview ? (
            <div className="rounded-md border border-fg/15 bg-surface-raised/80 p-2">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <p className="text-xs text-fg-muted">Vista previa del adjunto</p>
                {composer.file ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 -mt-0.5 cursor-pointer text-danger-500 hover:bg-danger-950/40 hover:text-danger-400 disabled:cursor-not-allowed disabled:opacity-50"
                    title={composer.busy ? "Publicando…" : "Quitar archivo"}
                    aria-label="Quitar archivo adjunto"
                    // While posting, the file is already uploading: removing it here would cancel nothing and
                    // the comment would go out with an attachment the UI no longer shows.
                    disabled={composer.busy}
                    onClick={() => composer.clearFile(fileRef.current)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : hasLinkOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 -mt-0.5 cursor-pointer text-danger-500 hover:bg-danger-950/40 hover:text-danger-400 disabled:cursor-not-allowed disabled:opacity-50"
                    title={composer.busy ? "Publicando…" : "Quitar enlace"}
                    aria-label="Quitar enlace adjunto"
                    disabled={composer.busy}
                    onClick={clearLinkAttachment}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
              <div className="relative mx-auto max-h-40 w-full max-w-sm overflow-hidden rounded-md bg-shade/40">
                {previewShowVideoTag ? (
                  <LocalVideoPreview
                    src={composer.objectUrl ?? ""}
                    title="Vista previa de video"
                    controls
                    className="mx-auto max-h-40 w-auto object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewImgSrc ?? ""}
                    alt="Vista previa del adjunto"
                    className="mx-auto max-h-40 w-full object-contain"
                  />
                )}
              </div>
            </div>
          ) : null}
          {composer.isSilentVideo ? (
            <SilentVideoGifOption
              compact
              checked={composer.uploadAsGif}
              disabled={composer.busy}
              onCheckedChange={composer.setUploadAsGif}
            />
          ) : null}
          <textarea
            ref={textareaRef}
            data-comment-composer-input
            className="w-full min-h-[120px] max-h-[260px] resize-none overflow-y-auto rounded-md bg-surface-raised border border-fg/15 px-3 py-2 text-sm text-fg placeholder:text-fg-subtle disabled:cursor-not-allowed disabled:opacity-70"
            placeholder={
              pendingPollVote
                ? "Escribí un comentario (opcional: podés publicar solo el voto)…"
                : "Escribí un comentario (opcional si hay adjunto válido)…"
            }
            title={commentSubmitShortcutTitle(commentSubmitShortcut)}
            value={composer.body}
            disabled={composer.busy}
            onTouchStart={startMobileTouch}
            onTouchMove={trackMobileTouch}
            onTouchEnd={finishMobileTouch}
            onTouchCancel={() => {
              touchStartRef.current = null;
              touchMovedRef.current = false;
            }}
            onFocus={positionFocusedComposerAboveKeyboard}
            onBlur={() => {
              focusScrollCleanupRef.current();
              viewportHeightBeforeFocusRef.current = null;
            }}
            onChange={(e) => composer.setBody(e.target.value)}
            onKeyDown={(e) => {
              if (
                !shouldSubmitCommentFromKey(commentSubmitShortcut, {
                  key: e.key,
                  shiftKey: e.shiftKey,
                  altKey: e.altKey,
                  ctrlKey: e.ctrlKey,
                  metaKey: e.metaKey,
                  isComposing: e.nativeEvent.isComposing,
                })
              )
                return;
              e.preventDefault();
              if (composer.busy) return;
              void composer.submit(fileRef.current);
            }}
            onPaste={(e) => {
              if (composer.busy) return;
              const mediaFile = getFirstClipboardVoxUploadFile(e.nativeEvent);
              if (!mediaFile) return;
              e.preventDefault();
              composer.onPickFile(mediaFile, fileRef.current);
            }}
            maxLength={COMMENT_BODY_MAX}
          />
          {canShowStaffBadge ? (
            <label className="flex cursor-pointer items-start gap-2 text-xs text-fg-muted">
              <input
                type="checkbox"
                className="mt-0.5 size-3.5 shrink-0 cursor-pointer rounded border-fg/25 accent-brand-500"
                checked={composer.showStaffIdentity}
                onChange={(e) => composer.setShowStaffIdentity(e.target.checked)}
              />
              <span>Mostrar mi usuario como staff</span>
            </label>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {/* No `accept`: when it only allows media, Chrome on Android opens the Google Photos picker
                  instead of the full chooser (camera, video, files, other apps). `intakePickedFile` validates
                  the type on selection and reports it right away. */}
              <input
                ref={fileRef}
                type="file"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  const nextFile = e.target.files?.[0] ?? null;
                  composer.onPickFile(nextFile, e.target);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 cursor-pointer border-fg/30 bg-surface-raised text-brand-100 hover:bg-surface-elevated hover:text-fg"
                title="Adjuntar imagen o video"
                aria-label="Adjuntar archivo"
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={`shrink-0 cursor-pointer border-fg/30 bg-surface-raised text-brand-100 hover:bg-surface-elevated hover:text-fg ${
                  linkBtnActive ? "border-brand-500/50 ring-1 ring-brand-500/35" : ""
                }`}
                title="Adjuntar enlace (imagen o YouTube)"
                aria-label="Adjuntar enlace"
                onClick={() => setLinkDialogOpen(true)}
              >
                <Link2 className="size-4" />
              </Button>
              {composer.file ? (
                <span
                  className="text-xs text-fg-muted truncate max-w-[min(100%,200px)]"
                  title={composer.file.name}
                >
                  {composer.file.name}
                </span>
              ) : null}
              {hasLinkOnly ? (
                <span
                  className="max-w-[min(100%,200px)] truncate text-xs text-brand-300/90"
                  title={composer.linkUrl}
                >
                  Enlace listo
                </span>
              ) : null}
            </div>
            <Button
              type="button"
              disabled={composer.busy}
              className={`shrink-0 ${primaryBtn}`}
              onClick={() => void composer.submit(fileRef.current)}
            >
              {composer.busy ? "Publicando…" : "Comentar"}
            </Button>
          </div>
          {composer.error ? (
            <FriendlyError size="compact" title="No se publicó" message={composer.error} />
          ) : null}
          <FileDropHintOverlay show={showDropOverlay} />
        </div>
      </>
    );
  },
);

CommentComposer.displayName = "CommentComposer";
