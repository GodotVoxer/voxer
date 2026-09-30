import { useCallback, useRef, useState } from "react";
import type { CommentPublic } from "@/lib/vox/types";
import {
  deleteCommentAsModerator,
  patchOwnCommentAsAdmin,
  patchOwnVoxAsAdmin,
  patchVoxCategoryAsModerator,
  purgePublicationMediaAsModerator,
} from "@/features/moderation/api";
import type {
  AsyncConfirmResult,
  CommentEditValues,
  StaffPublicationModTarget,
  VoxEditDraft,
} from "@/features/moderation/types";
import type { PublicationModerationResult } from "@/hooks/moderation/usePublicationModeration";
import { mergeCommentIntoList } from "@/features/comments/merge";

type Args = {
  voxId: string;
  router: { push: (href: string) => void };
  setComments: React.Dispatch<React.SetStateAction<CommentPublic[]>>;
  reloadComments: () => Promise<void>;
  reloadVox: () => Promise<void>;
};

export const useVoxDetailModeration = ({
  voxId,
  router,
  setComments,
  reloadComments,
  reloadVox,
}: Args) => {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editVoxDialogOpen, setEditVoxDialogOpen] = useState(false);
  const [editVoxDraft, setEditVoxDraft] = useState<VoxEditDraft>({ title: "", description: "" });
  const [newCategory, setNewCategory] = useState("");
  const [publicationStaffModOpen, setPublicationStaffModOpen] = useState(false);
  const [publicationStaffModTarget, setPublicationStaffModTarget] =
    useState<StaffPublicationModTarget | null>(null);

  const [editCommentTarget, setEditCommentTarget] = useState<CommentPublic | null>(null);
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<CommentPublic | null>(null);
  const deleteCommentTargetRef = useRef<CommentPublic | null>(null);

  const openReportVox = useCallback(() => {
    setReportCommentId(null);
    setReportOpen(true);
  }, []);

  const openReportComment = useCallback((comment: CommentPublic) => {
    setReportCommentId(comment.id);
    setReportOpen(true);
  }, []);

  const requestModeratorDeleteComment = useCallback((comment: CommentPublic) => {
    deleteCommentTargetRef.current = comment;
    setDeleteCommentTarget(comment);
  }, []);

  const dismissDeleteCommentDialog = useCallback(() => {
    deleteCommentTargetRef.current = null;
    setDeleteCommentTarget(null);
  }, []);

  // When the purge fails after the delete, retrying from the same dialog does not delete again.
  const deletedCommentIdRef = useRef<string | null>(null);

  const confirmModeratorDeleteComment = useCallback(
    async ({ purgePublicationMedia, blockPublicationMedia }: AsyncConfirmResult) => {
      const c = deleteCommentTargetRef.current;
      if (!c) return;
      if (deletedCommentIdRef.current !== c.id) {
        await deleteCommentAsModerator(c.id);
        deletedCommentIdRef.current = c.id;
        setComments((prev) => prev.filter((x) => x.id !== c.id));
      }
      if (purgePublicationMedia) {
        await purgePublicationMediaAsModerator(
          { kind: "comment", voxId, commentId: c.id },
          { block: blockPublicationMedia },
        );
      }
    },
    [setComments, voxId],
  );

  const openPublicationStaffModForComment = useCallback(
    (comment: CommentPublic) => {
      setPublicationStaffModTarget({ kind: "comment", voxId, commentId: comment.id });
      setPublicationStaffModOpen(true);
    },
    [voxId],
  );

  const openPublicationStaffModForVox = useCallback(() => {
    setPublicationStaffModTarget({ kind: "vox", voxId });
    setPublicationStaffModOpen(true);
  }, [voxId]);

  const onPublicationStaffCompleted = useCallback(
    async ({ target, deletedPublication, bannedAuthor }: PublicationModerationResult) => {
      if (deletedPublication && target.kind === "vox") {
        router.push("/");
        return;
      }
      if (deletedPublication && target.kind === "comment") {
        setComments((prev) => prev.filter((x) => x.id !== target.commentId));
      }
      // The ban may have deleted other publications of the author in this same vox.
      if (bannedAuthor) {
        await reloadComments();
        await reloadVox();
      }
    },
    [router, setComments, reloadComments, reloadVox],
  );

  // The draft is seeded on open and left alone: the vox may reload while the dialog is open
  // (resync on focus) and would overwrite what the admin is typing.
  const openEditVoxDialog = useCallback((current: VoxEditDraft) => {
    setEditVoxDraft({ title: current.title, description: current.description });
    setEditVoxDialogOpen(true);
  }, []);

  const onAdminEditVox = useCallback(
    async (values: { title: string; description: string }) => {
      await patchOwnVoxAsAdmin(voxId, values);
      setEditVoxDialogOpen(false);
      await reloadVox();
    },
    [voxId, reloadVox],
  );

  const onAdminEditComment = useCallback(
    async (commentId: string, values: CommentEditValues) => {
      const updated = await patchOwnCommentAsAdmin(commentId, values);
      setComments((prev) => mergeCommentIntoList(prev, updated));
      setEditCommentTarget(null);
    },
    [setComments],
  );

  const onModeratorRecategorize = useCallback(async () => {
    if (!newCategory) return;
    await patchVoxCategoryAsModerator(voxId, newCategory);
    setCategoryDialogOpen(false);
    await reloadVox();
  }, [voxId, newCategory, reloadVox]);

  return {
    reportOpen,
    setReportOpen,
    reportCommentId,
    categoryDialogOpen,
    setCategoryDialogOpen,
    editVoxDialogOpen,
    setEditVoxDialogOpen,
    editVoxDraft,
    setEditVoxDraft,
    openEditVoxDialog,
    newCategory,
    setNewCategory,
    openReportVox,
    openReportComment,
    deleteCommentTarget,
    dismissDeleteCommentDialog,
    confirmModeratorDeleteComment,
    requestModeratorDeleteComment,
    onModeratorRecategorize,
    onAdminEditVox,
    editCommentTarget,
    setEditCommentTarget,
    onAdminEditComment,
    reloadComments,
    reloadVox,
    publicationStaffModOpen,
    setPublicationStaffModOpen,
    publicationStaffModTarget,
    setPublicationStaffModTarget,
    openPublicationStaffModForComment,
    openPublicationStaffModForVox,
    onPublicationStaffCompleted,
  };
};
