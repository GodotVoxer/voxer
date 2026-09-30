import { type ChangeEvent, useMemo, useState } from "react";
import { useObjectUrlForFile } from "@/hooks/media/useObjectUrlForFile";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/store";
import {
  ensureRulesAccepted,
  isRulesNotAcceptedError,
  markRulesNotAccepted,
} from "@/features/auth/rulesPromptStore";
import { createVox, uploadMedia } from "@/features/vox/api";
import { useVoxStore } from "@/features/vox/store";
import { DEFAULT_VOX_CATEGORY } from "@/lib/vox/categories";
import {
  parseBannedFromAxios,
  parseClientNetworkBlockedFromAxios,
  type BanApiClientPayload,
} from "@/features/moderation/bannedPayload";
import { parseMediaLink } from "@/features/media/mediaLink";
import { isLocalVoxUploadVideoFile } from "@/features/media/uploadClientFiles";
import { intakePickedFile } from "@/features/media/pickedFileIntake";
import { clientUploadSizeRejectionMessage } from "@/features/media/uploadClientGuard";
import { userFacingUploadHttpError } from "@/features/media/uploadErrorMessage";
import { clientFileReadErrorMessage } from "@/features/media/fileReadErrorMessage";
import {
  clientThrownErrorMessage,
  userFacingApiErrorMessage,
} from "@/features/http/responseErrors";
import { youtubeThumbnailUrl } from "@/lib/media/youtube";
import {
  VOX_CATEGORY_LUGARES_IDIOMAS,
  VOX_CATEGORY_POLITICA,
} from "@/lib/vox/categoryFeatureDefaults";
import { useSilentVideoOption } from "@/hooks/media/useSilentVideoOption";
import { voxPath } from "@/lib/vox/paths";

export const useCreateVoxForm = () => {
  const router = useRouter();
  const refreshCurrentView = useVoxStore((s) => s.refreshCurrentView);
  const authUser = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const openAuthDialog = useAuthStore((s) => s.openAuthDialog);

  const [dialogOpen, setDialogOpenState] = useState(false);
  const [linkFieldOpen, setLinkFieldOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(DEFAULT_VOX_CATEGORY);
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { isSilentVideo, uploadAsGif, setUploadAsGif } = useSilentVideoOption(file);
  const objectUrl = useObjectUrlForFile(file);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banPayload, setBanPayload] = useState<BanApiClientPayload | null>(null);
  const [threadUniqueIds, setThreadUniqueIds] = useState(false);
  const [countryFlags, setCountryFlags] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  const onCategoryChange = (nextCategory: string) => {
    setCategory(nextCategory);
    setThreadUniqueIds(nextCategory === VOX_CATEGORY_POLITICA);
    setCountryFlags(nextCategory === VOX_CATEGORY_LUGARES_IDIOMAS);
  };

  const preview = useMemo(() => {
    if (file && objectUrl) {
      const isVideo = isLocalVoxUploadVideoFile(file);
      return { thumb: objectUrl, isYoutube: false, isLocalVideo: isVideo };
    }
    const parsed = parseMediaLink(linkUrl);
    if (parsed?.kind === "YOUTUBE") {
      return { thumb: youtubeThumbnailUrl(parsed.videoId), isYoutube: true, isLocalVideo: false };
    }
    if (parsed?.kind === "IMAGE") {
      return { thumb: parsed.url, isYoutube: false, isLocalVideo: false };
    }
    return { thumb: null as string | null, isYoutube: false, isLocalVideo: false };
  }, [file, linkUrl, objectUrl]);

  const resetForm = (fileInput: HTMLInputElement | null) => {
    setTitle("");
    setDescription("");
    setCategory(DEFAULT_VOX_CATEGORY);
    setLinkUrl("");
    setLinkFieldOpen(false);
    setFile(null);
    setError(null);
    setThreadUniqueIds(false);
    setCountryFlags(false);
    setPollEnabled(false);
    setPollOptions(["", ""]);
    if (fileInput) fileInput.value = "";
  };

  const setDialogOpen = (open: boolean) => {
    if (!open) {
      setLinkFieldOpen(Boolean(linkUrl.trim()));
      if (!linkUrl.trim()) resetForm(null);
    }
    setDialogOpenState(open);
  };

  // Closing programmatically skips the dialog's onOpenChange, so reset here too.
  const closeAfterPublish = () => {
    resetForm(null);
    setDialogOpenState(false);
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    // Kept before the await: afterwards the handler no longer owns the event.
    const input = event.target;
    const nextFile = input.files?.[0] ?? null;
    if (!nextFile) {
      setFile(null);
      setError(null);
      return;
    }
    const intake = await intakePickedFile(nextFile);
    if (!intake.ok) {
      setError(intake.message);
      input.value = "";
      return;
    }
    setFile(intake.file);
    setLinkUrl("");
    setError(null);
  };

  const clearFile = (fileInput: HTMLInputElement | null) => {
    setFile(null);
    if (fileInput) fileInput.value = "";
    setError(null);
  };

  const onLinkChange = (
    event: ChangeEvent<HTMLInputElement>,
    fileInput: HTMLInputElement | null,
  ) => {
    setLinkUrl(event.target.value);
    if (event.target.value.trim()) {
      setFile(null);
      if (fileInput) fileInput.value = "";
    }
    setError(null);
  };

  const applyPastedImageFile = async (nextFile: File, fileInput: HTMLInputElement | null) => {
    const intake = await intakePickedFile(nextFile);
    if (!intake.ok) {
      setError(intake.message);
      return;
    }
    setFile(intake.file);
    setLinkUrl("");
    if (fileInput) fileInput.value = "";
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!authLoading && !authUser) {
      openAuthDialog();
      setError("Tenés que iniciar sesión para publicar un vox.");
      return;
    }
    const titleTrimmed = title.trim();
    const descriptionTrimmed = description.trim();
    if (!titleTrimmed || !descriptionTrimmed) {
      setError("Completá título y descripción.");
      return;
    }
    if (pollEnabled) {
      const trimmedPoll = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (trimmedPoll.length < 2 || trimmedPoll.length > 5) {
        setError("La encuesta necesita entre 2 y 5 opciones con texto.");
        return;
      }
      const lower = trimmedPoll.map((t) => t.toLowerCase());
      if (new Set(lower).size !== lower.length) {
        setError("Las opciones de la encuesta no pueden repetirse.");
        return;
      }
    }
    if (file) {
      const sizeError = clientUploadSizeRejectionMessage(file);
      if (sizeError) {
        setError(sizeError);
        return;
      }
    }
    if (!(await ensureRulesAccepted())) {
      setError("Tenés que aceptar las reglas de Voxer para publicar.");
      return;
    }
    setBusy(true);
    try {
      const featurePayload = {
        threadUniqueIdsEnabled: threadUniqueIds,
        countryFlagsEnabled: countryFlags,
        ...(pollEnabled
          ? {
              poll: {
                options: pollOptions.map((o) => o.trim()).filter(Boolean),
              },
            }
          : {}),
      };
      if (file) {
        const upload = await uploadMedia(file);
        const { id } = await createVox({
          title: titleTrimmed,
          description: descriptionTrimmed,
          category,
          // An animated GIF comes back as `IMAGE` with an MP4 inside: stored as an uploaded video, the flag
          // makes the cover and the detail play it looped like a GIF.
          mediaType: upload.kind === "IMAGE" && !upload.animatedImage ? "IMAGE" : "UPLOADED_VIDEO",
          mediaUrl: upload.mediaUrl,
          thumbnailUrl: upload.thumbnailUrl,
          ...(upload.animatedImage || uploadAsGif ? { animatedImage: true } : {}),
          ...featurePayload,
        });
        router.push(voxPath(id));
        void refreshCurrentView();
        closeAfterPublish();
        return;
      }
      const parsed = parseMediaLink(linkUrl);
      if (!parsed) {
        setError("Subí un archivo o pegá un enlace válido (imagen o YouTube).");
        setBusy(false);
        return;
      }
      if (parsed.kind === "YOUTUBE") {
        const { id } = await createVox({
          title: titleTrimmed,
          description: descriptionTrimmed,
          category,
          mediaType: "YOUTUBE",
          youtubeUrl: linkUrl.trim(),
          ...featurePayload,
        });
        router.push(voxPath(id));
        void refreshCurrentView();
        closeAfterPublish();
        return;
      }
      const { id } = await createVox({
        title: titleTrimmed,
        description: descriptionTrimmed,
        category,
        mediaType: "IMAGE",
        mediaUrl: parsed.url,
        thumbnailUrl: parsed.url,
        ...featurePayload,
      });
      router.push(voxPath(id));
      void refreshCurrentView();
      closeAfterPublish();
    } catch (unknownError: unknown) {
      if (isRulesNotAcceptedError(unknownError)) {
        markRulesNotAccepted();
        const accepted = await ensureRulesAccepted();
        setError(
          accepted
            ? "Listo, ya aceptaste las reglas. Volvé a publicar el vox."
            : "Tenés que aceptar las reglas de Voxer para publicar.",
        );
        return;
      }
      const banned = parseBannedFromAxios(unknownError);
      if (banned) {
        setBanPayload(banned.ban);
        setBanDialogOpen(true);
        return;
      }
      const netBlock = parseClientNetworkBlockedFromAxios(unknownError);
      if (netBlock?.ban) {
        setBanPayload(netBlock.ban);
        setBanDialogOpen(true);
        return;
      }
      if (netBlock) {
        setError(netBlock.error ?? "Publicar desde esta conexión no está permitido.");
        return;
      }
      const ax = unknownError as { response?: { status?: number } };
      const uploadOrHttp = userFacingUploadHttpError(unknownError);
      const message =
        uploadOrHttp ??
        userFacingApiErrorMessage(unknownError) ??
        clientFileReadErrorMessage(unknownError) ??
        clientThrownErrorMessage(unknownError);
      if (ax.response?.status === 401) {
        openAuthDialog();
        setError(message ?? "Iniciá sesión para publicar.");
      } else {
        setError(message ?? "No se pudo crear el vox. Revisá la conexión o la API.");
      }
    } finally {
      setBusy(false);
    }
  };

  return {
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
    resetForm,
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
    setPollOptions,
    addPollOptionRow: () => {
      setPollOptions((prev) => (prev.length >= 5 ? prev : [...prev, ""]));
    },
    removePollOptionRow: (index: number) => {
      setPollOptions((prev) => {
        if (prev.length <= 2) return prev;
        return prev.filter((_, i) => i !== index);
      });
    },
    setPollOptionAt: (index: number, value: string) => {
      setPollOptions((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
    },
  };
};
