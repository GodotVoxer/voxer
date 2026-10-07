"use client";
import { useRef } from "react";
import { Paperclip, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CATEGORY_GROUPS } from "@/lib/vox/categoryCodes";
import { VOX_DESCRIPTION_MAX, VOX_POLL_OPTION_MAX, VOX_TITLE_MAX } from "@/lib/limits";
import { FriendlyError } from "@/components/Shell/FriendlyError";
import { BanBlockedDialog } from "@/components/Moderation/Dialogs/BanBlockedDialog";
import { VoxFormPreview } from "./VoxFormPreview";
import { CreateVoxTriggerButton } from "./CreateVoxTriggerButton";
import { FileDropHintOverlay } from "@/components/FileDrop/FileDropHintOverlay";
import { getFirstClipboardVoxUploadFile } from "@/features/media/uploadClientFiles";
import { useCreateVoxForm } from "@/hooks/vox/useCreateVoxForm";
import { useDropFilesOverlay } from "@/hooks/media/useDropFilesOverlay";
import { SilentVideoGifOption } from "@/components/Media/SilentVideoGifOption";

const outlineBtn =
  "cursor-pointer border border-fg/40 bg-surface-raised text-fg hover:bg-fg/10 hover:text-fg";
const primaryBtn = "cursor-pointer bg-brand-600 text-on-solid hover:bg-brand-500 shadow-sm";

export const CreateVoxDialog = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const {
    dialogOpen,
    setDialogOpen,
    linkFieldOpen,
    setLinkFieldOpen,
    title,
    setTitle,
    description,
    setDescription,
    category,
    onCategoryChange,
    linkUrl,
    busy,
    error,
    preview,
    file,
    isSilentVideo,
    uploadAsGif,
    setUploadAsGif,
    onFileChange,
    clearFile,
    onLinkChange,
    applyPastedImageFile,
    submit,
    banDialogOpen,
    setBanDialogOpen,
    banPayload,
    threadUniqueIds,
    setThreadUniqueIds,
    countryFlags,
    setCountryFlags,
    pollEnabled,
    setPollEnabled,
    pollOptions,
    addPollOptionRow,
    removePollOptionRow,
    setPollOptionAt,
  } = useCreateVoxForm();

  const { showDropOverlay, dropHandlers } = useDropFilesOverlay({
    onDropFile: (nextFile) => applyPastedImageFile(nextFile, fileInputRef.current),
    disabled: !dialogOpen || busy,
  });

  return (
    <>
      <BanBlockedDialog open={banDialogOpen} onOpenChange={setBanDialogOpen} ban={banPayload} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <CreateVoxTriggerButton />
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl border-fg/10" aria-describedby={undefined}>
          <div className="relative grid min-h-0 w-full gap-4" {...dropHandlers}>
            <DialogHeader>
              <DialogTitle>Nuevo vox</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2 sm:items-start sm:gap-x-4 sm:gap-y-0">
              <div className="flex w-full justify-center sm:col-start-2 sm:row-start-1 sm:ml-auto sm:w-full sm:max-w-[260px] sm:shrink-0 sm:justify-end">
                <VoxFormPreview
                  thumbnailUrl={preview.thumb}
                  title={title}
                  category={category}
                  isYoutube={preview.isYoutube}
                  isLocalVideo={preview.isLocalVideo}
                  hasPoll={
                    pollEnabled && pollOptions.map((o) => o.trim()).filter(Boolean).length >= 2
                  }
                  onEmptyPreviewClick={() => fileInputRef.current?.click()}
                  emptyPreviewDisabled={busy}
                />
              </div>

              <div className="space-y-3 sm:col-start-1 sm:row-start-1 sm:row-span-2 sm:min-w-0 sm:self-start">
                <div className="grid gap-2">
                  <span className="text-sm text-fg-secondary">Archivo (imagen o video)</span>
                  {/* No `accept`: when it only allows media, Chrome on Android opens the Google Photos picker
                      instead of the full chooser (camera, video, files, other apps). `intakePickedFile` validates
                      the type on selection and reports it right away. */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    tabIndex={-1}
                    onChange={onFileChange}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-fit cursor-pointer border-brand-600/50 bg-surface-raised px-3 text-brand-100 hover:bg-brand-950 hover:text-fg"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Seleccionar archivo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={`w-fit cursor-pointer border-fg/25 bg-surface-raised px-3 text-fg-soft hover:bg-surface-elevated hover:text-fg ${
                        linkFieldOpen || linkUrl.trim()
                          ? "border-brand-500/50 ring-1 ring-brand-500/35"
                          : ""
                      }`}
                      aria-expanded={linkFieldOpen}
                      aria-controls="create-vox-link-field"
                      onClick={() => {
                        const nextOpen = !linkFieldOpen;
                        setLinkFieldOpen(nextOpen);
                        if (nextOpen) requestAnimationFrame(() => linkInputRef.current?.focus());
                      }}
                    >
                      <Paperclip className="size-4" aria-hidden />
                      Pegar enlace
                    </Button>
                  </div>
                  {!file ? (
                    <p className="text-xs leading-snug text-fg-subtle">
                      Sin archivo — JPG, PNG, WebP, GIF; video MP4 o WebM.
                    </p>
                  ) : null}
                </div>
                {linkFieldOpen ? (
                  <label
                    id="create-vox-link-field"
                    className="grid gap-1 text-sm text-fg-secondary"
                  >
                    Enlace de imagen o YouTube
                    <input
                      ref={linkInputRef}
                      className="rounded-md border border-brand-500/35 bg-surface-sunken px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
                      value={linkUrl}
                      onChange={(e) => onLinkChange(e, fileInputRef.current)}
                      onPaste={(e) => {
                        const mediaFile = getFirstClipboardVoxUploadFile(e.nativeEvent);
                        if (!mediaFile) return;
                        e.preventDefault();
                        applyPastedImageFile(mediaFile, fileInputRef.current);
                        setLinkFieldOpen(false);
                      }}
                      placeholder="https://…"
                    />
                  </label>
                ) : null}
                {file ? (
                  <div className="flex min-h-8 items-center justify-between gap-2 rounded-md border border-fg/10 bg-surface-sunken/60 px-2.5 py-1.5">
                    <span className="min-w-0 truncate text-xs text-fg-secondary" title={file.name}>
                      {file.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 cursor-pointer text-danger-500 hover:bg-danger-950/40 hover:text-danger-400 disabled:cursor-not-allowed disabled:opacity-50"
                      title={busy ? "Publicando…" : "Quitar archivo"}
                      aria-label="Quitar archivo adjunto"
                      disabled={busy}
                      onClick={() => clearFile(fileInputRef.current)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ) : null}
                {isSilentVideo ? (
                  <SilentVideoGifOption
                    checked={uploadAsGif}
                    disabled={busy}
                    onCheckedChange={setUploadAsGif}
                  />
                ) : null}

                <label className="grid gap-1 text-sm text-fg-secondary">
                  Título
                  <input
                    className="rounded-md border border-fg/15 bg-surface-sunken px-3 py-2 text-sm text-fg"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={VOX_TITLE_MAX}
                  />
                </label>
                <label className="grid gap-1 text-sm text-fg-secondary">
                  Descripción
                  <textarea
                    className="min-h-[88px] rounded-md border border-fg/15 bg-surface-sunken px-3 py-2 text-sm text-fg"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={VOX_DESCRIPTION_MAX}
                  />
                </label>
                <label className="grid gap-1 text-sm text-fg-secondary">
                  Categoría
                  <select
                    className="cursor-pointer rounded-md border border-fg/15 bg-surface-sunken px-3 py-2 text-sm text-fg"
                    value={category}
                    onChange={(e) => onCategoryChange(e.target.value)}
                  >
                    {CATEGORY_GROUPS.map((group) => (
                      <optgroup key={group.id} label={group.label} className="bg-surface-sunken">
                        {group.categories.map((c) => (
                          <option key={c} value={c} className="bg-surface-sunken text-fg">
                            {c}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                {error ? (
                  <FriendlyError
                    size="compact"
                    title={
                      error.startsWith("Completá") || error.startsWith("Subí")
                        ? "Revisá el formulario"
                        : "No pudimos publicar"
                    }
                    message={error}
                  />
                ) : null}
              </div>

              <div className="w-full min-w-0 space-y-2 rounded-md border border-fg/10 bg-surface-sunken/50 p-3 sm:col-start-2 sm:row-start-2 sm:ml-auto sm:max-w-[260px] sm:shrink-0">
                <p className="text-xs font-medium text-fg-muted">Opciones del vox</p>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-fg-soft">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 cursor-pointer accent-brand-500"
                    checked={threadUniqueIds}
                    onChange={(e) => setThreadUniqueIds(e.target.checked)}
                  />
                  <span>ID único en comentarios</span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-fg-soft">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 cursor-pointer accent-brand-500"
                    checked={countryFlags}
                    onChange={(e) => setCountryFlags(e.target.checked)}
                  />
                  <span>Banderas</span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-fg-soft">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 cursor-pointer accent-brand-500"
                    checked={pollEnabled}
                    onChange={(e) => setPollEnabled(e.target.checked)}
                  />
                  <span>Encuesta</span>
                </label>
                {pollEnabled ? (
                  <div className="grid gap-2 pt-1">
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          className="min-w-0 flex-1 rounded-md border border-fg/15 bg-surface-sunken px-2 py-1.5 text-sm text-fg"
                          placeholder={`Opción ${i + 1}`}
                          value={opt}
                          maxLength={VOX_POLL_OPTION_MAX}
                          onChange={(e) => setPollOptionAt(i, e.target.value)}
                        />
                        {pollOptions.length > 2 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0 cursor-pointer text-danger-400 hover:bg-danger-950/30"
                            title="Quitar opción"
                            aria-label="Quitar opción"
                            onClick={() => removePollOptionRow(i)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                    {pollOptions.length < 5 ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-fit cursor-pointer border-fg/20 bg-surface-raised text-xs text-fg hover:bg-fg/10"
                        onClick={() => addPollOptionRow()}
                      >
                        <Plus className="mr-1 inline size-3" />
                        Agregar opción
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                <p className="text-[11px] leading-snug text-fg-subtle">
                  También podés activar ID único o banderas con las líneas{" "}
                  <code className="text-fg-muted">&gt;&gt;idunico</code> o{" "}
                  <code className="text-fg-muted">&gt;&gt;banderitas</code> en la descripción.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 pb-4 sm:justify-end sm:pb-0">
              <Button
                type="button"
                variant="outline"
                className={outlineBtn}
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={busy}
                className={primaryBtn}
                onClick={() => void submit()}
              >
                {busy ? "Creando…" : "Publicar"}
              </Button>
            </DialogFooter>
            <FileDropHintOverlay show={showDropOverlay} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
