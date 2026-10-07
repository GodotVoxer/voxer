import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  banUserContentAsModerator,
  deleteCommentAsModerator,
  deleteVoxAsModerator,
  fetchModerationCommentAuthorId,
  fetchModerationVoxOwnerId,
  postModerationBan,
  purgePublicationMediaAsModerator,
} from "@/features/moderation/api";
import { useAuthStore } from "@/features/auth/store";
import type { StaffPublicationModTarget } from "@/features/moderation/types";
import { isAdminRole } from "@/lib/moderation/roles";
import {
  banContentWindow,
  DEFAULT_AUTHOR_BAN_DRAFT,
  fateDeletesPublication,
  illegalContentPreset,
  fatePurgesMedia,
  parsePositiveInt,
  publicationModerationConfirmLabel,
  publicationModerationProblem,
  publicationModerationSummary,
  type AuthorBanDraft,
  type PublicationFate,
  type PublicationModerationPlan,
} from "@/features/moderation/publicationPlan";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";
import { useAuthorContentCounts } from "@/hooks/moderation/useAuthorContentCounts";

export type PublicationModerationResult = {
  target: StaffPublicationModTarget;
  deletedPublication: boolean;
  bannedAuthor: boolean;
};

type Args = {
  target: StaffPublicationModTarget;
  onCompleted: (result: PublicationModerationResult) => void | Promise<void>;
};

type ModerationStep = "delete" | "purge" | "ban" | "content";

const STEP_FAILURE: Record<ModerationStep, string> = {
  delete: "No se pudo eliminar la publicación.",
  purge: "Falló borrar la multimedia de la publicación.",
  ban: "Falló el ban del autor.",
  content: "Falló borrar las otras publicaciones del autor.",
};

const STEP_DONE: Record<ModerationStep, string> = {
  delete: "la publicación se eliminó",
  purge: "la multimedia se borró",
  ban: "el autor quedó baneado",
  content: "sus otras publicaciones se borraron",
};

/** Says what failed and what is already done, so a retry does not look like redoing everything. */
const moderationStepFailureMessage = (
  failed: ModerationStep,
  applied: Record<ModerationStep, boolean>,
  error: unknown,
): string => {
  const doneSteps = (Object.keys(applied) as ModerationStep[]).filter((s) => applied[s]);
  const detail = userFacingApiErrorMessage(error);
  const parts = [STEP_FAILURE[failed]];
  if (doneSteps.length > 0) {
    const list = doneSteps.map((s) => STEP_DONE[s]).join(", ");
    parts.push(`Ya se aplicó: ${list}. Reintentar sigue desde lo que falta.`);
  }
  if (detail) parts.push(detail);
  return parts.join(" ");
};

export type PublicationAuthorState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; ownerId: string | null };

/** State of the Moderate publication dialog; it lives in the dialog content, which Radix unmounts on close, so every opening starts fresh. */
export const usePublicationModeration = ({ target, onCompleted }: Args) => {
  const [fate, setFate] = useState<PublicationFate>("delete");
  const [banEnabled, setBanEnabled] = useState(false);
  const [banDraft, setBanDraft] = useState<AuthorBanDraft>(DEFAULT_AUTHOR_BAN_DRAFT);
  const [owner, setOwner] = useState<PublicationAuthorState>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewerRole = useAuthStore((s) => s.user?.role);
  // The block is permanent and global; the server enforces it again.
  const canBlockMedia = isAdminRole(viewerRole);

  const targetKind = target.kind;
  const targetId = target.kind === "vox" ? target.voxId : target.commentId;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ownerId =
          targetKind === "vox"
            ? (await fetchModerationVoxOwnerId(targetId)).ownerId
            : (await fetchModerationCommentAuthorId(targetId)).authorId;
        if (!cancelled) setOwner({ status: "ready", ownerId });
      } catch (e) {
        if (!cancelled) {
          setOwner({
            status: "error",
            message:
              userFacingApiErrorMessage(e) ??
              "No se pudo cargar la cuenta del autor. ¿Seguís con sesión de staff?",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetKind, targetId]);

  const ownerId = owner.status === "ready" ? owner.ownerId : null;
  const canBan = ownerId !== null;

  const plan: PublicationModerationPlan = useMemo(
    () => ({ kind: targetKind, fate, ban: banEnabled && canBan ? banDraft : null }),
    [targetKind, fate, banEnabled, canBan, banDraft],
  );
  const summaryLines = useMemo(() => publicationModerationSummary(plan), [plan]);
  const confirmLabel = publicationModerationConfirmLabel(plan);
  const nothingChosen = plan.fate === "keep" && !plan.ban;

  const updateBanDraft = useCallback((patch: Partial<AuthorBanDraft>) => {
    setBanDraft((prev) => ({ ...prev, ...patch }));
    setError(null);
  }, []);

  const chooseFate = useCallback((next: PublicationFate) => {
    setFate(next);
    setError(null);
  }, []);

  const toggleBan = useCallback((next: boolean) => {
    setBanEnabled(next);
    setError(null);
  }, []);

  const applyIllegalContentPreset = useCallback(() => {
    const preset = illegalContentPreset(banDraft, canBlockMedia);
    setFate(preset.fate);
    setBanDraft(preset.ban);
    setBanEnabled(canBan);
    setError(null);
  }, [banDraft, canBlockMedia, canBan]);

  const contentCounts = useAuthorContentCounts(banEnabled ? ownerId : null, banDraft);

  // Steps already applied: when one fails midway, a retry does not repeat what the server did.
  const appliedRef = useRef<Record<ModerationStep, boolean>>({
    delete: false,
    purge: false,
    ban: false,
    content: false,
  });

  const submit = useCallback(async () => {
    const problem = publicationModerationProblem(plan);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const applied = appliedRef.current;
    const outcome: { failedStep: ModerationStep | null; error: unknown } = {
      failedStep: null,
      error: null,
    };
    const run = async (step: ModerationStep, action: () => Promise<unknown>) => {
      if (outcome.failedStep || applied[step]) return;
      try {
        await action();
        applied[step] = true;
      } catch (e) {
        outcome.failedStep = step;
        outcome.error = e;
      }
    };

    if (fateDeletesPublication(plan.fate)) {
      await run("delete", () =>
        target.kind === "vox"
          ? deleteVoxAsModerator(target.voxId)
          : deleteCommentAsModerator(target.commentId),
      );
    }
    if (fatePurgesMedia(plan.fate)) {
      await run("purge", () =>
        purgePublicationMediaAsModerator(target, { block: plan.fate === "block" }),
      );
    }
    const ban = plan.ban;
    if (ban && ownerId) {
      await run("ban", () =>
        postModerationBan({
          targetUserId: ownerId,
          reason: ban.reason.trim(),
          unit: ban.permanent ? "DAYS" : ban.unit,
          value: ban.permanent ? 0 : (parsePositiveInt(ban.amount) ?? 0),
          blockClientNetwork: ban.blockNetwork,
        }),
      );
      const contentWindow = banContentWindow(ban);
      if (contentWindow) {
        await run("content", () =>
          banUserContentAsModerator(ownerId, { ...contentWindow, media: ban.contentMedia }),
        );
      }
    }

    setBusy(false);
    const result: PublicationModerationResult = {
      target,
      deletedPublication: applied.delete,
      bannedAuthor: applied.ban,
    };
    if (outcome.failedStep) {
      setError(moderationStepFailureMessage(outcome.failedStep, applied, outcome.error));
      // What was applied must show in the list behind the dialog too.
      if (applied.delete || applied.ban) await onCompleted(result);
      return;
    }
    setDone(true);
    await onCompleted(result);
  }, [plan, target, ownerId, onCompleted]);

  return {
    fate,
    chooseFate,
    canBlockMedia,
    owner,
    canBan,
    banEnabled,
    toggleBan,
    applyIllegalContentPreset,
    contentCounts,
    banDraft,
    updateBanDraft,
    summaryLines,
    confirmLabel,
    nothingChosen,
    busy,
    done,
    error,
    submit,
  };
};
