import { useMemo, useState } from "react";
import { useObjectUrlForFile } from "@/hooks/media/useObjectUrlForFile";
import { useAuthStore } from "@/features/auth/store";
import {
  ensureRulesAccepted,
  isRulesNotAcceptedError,
  markRulesNotAccepted,
} from "@/features/auth/rulesPromptStore";
import { postComment, uploadMedia } from "@/features/vox/api";
import { useVoxStore } from "@/features/vox/store";
import type { CommentPublic } from "@/lib/vox/types";
import { replyTagsErrorMessageEs, validateCommentReplyTagCountOnly } from "@/lib/comments/replies";
import {
  parseBannedFromAxios,
  parseClientNetworkBlockedFromAxios,
  type BanApiClientPayload,
} from "@/features/moderation/bannedPayload";
import { parseMediaLink } from "@/features/media/mediaLink";
import { isLocalVoxUploadVideoFile } from "@/features/media/uploadClientFiles";
import { youtubeThumbnailUrl } from "@/lib/media/youtube";
import { intakePickedFile } from "@/features/media/pickedFileIntake";
import { clientUploadSizeRejectionMessage } from "@/features/media/uploadClientGuard";
import { userFacingUploadHttpError } from "@/features/media/uploadErrorMessage";
import { clientFileReadErrorMessage } from "@/features/media/fileReadErrorMessage";
import {
  clientThrownErrorMessage,
  userFacingApiErrorMessage,
} from "@/features/http/responseErrors";
import { useSilentVideoOption } from "@/hooks/media/useSilentVideoOption";
import { isStaffRole } from "@/lib/moderation/roles";

type Args = {
  voxId: string;
  onPosted: (posted: CommentPublic) => void;
  pendingPollVote?: { optionId: string; label: string } | null;
};

export const useCommentComposer = ({ voxId, onPosted, pendingPollVote = null }: Args) => {
  const authUser = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const openAuthDialog = useAuthStore((s) => s.openAuthDialog);

  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { isSilentVideo, uploadAsGif, setUploadAsGif } = useSilentVideoOption(file);
  const objectUrl = useObjectUrlForFile(file);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banPayload, setBanPayload] = useState<BanApiClientPayload | null>(null);
  const [showStaffIdentity, setShowStaffIdentity] = useState(false);

  const linkPreview = useMemo(() => {
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

  const clearFile = (fileInput: HTMLInputElement | null) => {
    setFile(null);
    if (fileInput) fileInput.value = "";
    setError(null);
  };

  const onPickFile = async (nextFile: File | null, inputElement: HTMLInputElement | null) => {
    if (!nextFile) {
      setFile(null);
      setError(null);
      return;
    }
    const intake = await intakePickedFile(nextFile);
    if (!intake.ok) {
      setError(intake.message);
      if (inputElement) inputElement.value = "";
      return;
    }
    setLinkUrl("");
    setFile(intake.file);
    setError(null);
  };

  const onLinkChange = (value: string, fileInput: HTMLInputElement | null | undefined) => {
    setLinkUrl(value);
    if (value.trim()) {
      setFile(null);
      if (fileInput) fileInput.value = "";
    }
    setError(null);
  };

  const submit = async (fileInput: HTMLInputElement | null) => {
    setError(null);
    if (!authLoading && !authUser) {
      openAuthDialog();
      setError("Tenés que iniciar sesión para comentar.");
      return;
    }
    const text = body.trim();
    const linkTrim = linkUrl.trim();
    const hasMediaIntent = Boolean(file || linkTrim);
    if (!text && !hasMediaIntent && !pendingPollVote) {
      setError("Escribí un mensaje, adjuntá multimedia o mostrá tu voto.");
      return;
    }
    const tagCountError = validateCommentReplyTagCountOnly(text);
    if (tagCountError) {
      setError(replyTagsErrorMessageEs(tagCountError));
      return;
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
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;
      let videoPosterUrl: string | undefined;
      let animatedImage: boolean | undefined;
      let youtubeUrl: string | undefined;
      if (file) {
        const upload = await uploadMedia(file, { intent: "comment" });
        // An animated GIF comes back as `IMAGE` with an MP4 inside: it goes in the video field with its
        // poster, and the flag makes it render as a GIF rather than a video.
        if (upload.kind === "IMAGE" && !upload.animatedImage) imageUrl = upload.mediaUrl;
        else {
          videoUrl = upload.mediaUrl;
          videoPosterUrl = upload.thumbnailUrl;
          if (upload.animatedImage || uploadAsGif) animatedImage = true;
        }
      } else if (linkTrim) {
        const parsed = parseMediaLink(linkTrim);
        if (!parsed) {
          setError("Pegá un enlace válido (imagen o YouTube).");
          setBusy(false);
          return;
        }
        if (parsed.kind === "YOUTUBE") {
          youtubeUrl = linkTrim;
        } else {
          imageUrl = parsed.url;
        }
      }
      const posted = await postComment(voxId, {
        body: text,
        imageUrl,
        videoUrl,
        videoPosterUrl,
        animatedImage,
        youtubeUrl,
        ...(pendingPollVote ? { pollDisclosureOptionId: pendingPollVote.optionId } : {}),
        ...(authUser && isStaffRole(authUser.role) ? { showStaffIdentity } : {}),
      });
      useVoxStore.getState().applyHomeFeedActivity(voxId);
      setBody("");
      setLinkUrl("");
      setShowStaffIdentity(false);
      setFile(null);
      if (fileInput) fileInput.value = "";
      onPosted(posted);
    } catch (unknownError: unknown) {
      if (isRulesNotAcceptedError(unknownError)) {
        markRulesNotAccepted();
        const accepted = await ensureRulesAccepted();
        setError(
          accepted
            ? "Listo, ya aceptaste las reglas. Volvé a enviar el comentario."
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
        setError(message ?? "Iniciá sesión para comentar.");
      } else {
        setError(message ?? "No se pudo publicar. Reintentá.");
      }
    } finally {
      setBusy(false);
    }
  };

  return {
    authUser,
    authLoading,
    openAuthDialog,
    body,
    setBody,
    linkUrl,
    onLinkChange,
    linkPreview,
    file,
    isSilentVideo,
    uploadAsGif,
    setUploadAsGif,
    objectUrl,
    busy,
    error,
    banDialogOpen,
    setBanDialogOpen,
    banPayload,
    showStaffIdentity,
    setShowStaffIdentity,
    clearFile,
    onPickFile,
    submit,
  };
};
