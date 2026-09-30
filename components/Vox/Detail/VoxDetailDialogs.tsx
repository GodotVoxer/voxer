"use client";
import { ReportEntityDialog } from "@/components/Moderation/Dialogs/ReportEntityDialog";
import {
  PublicationStaffModerationDialog,
  type PublicationModerationResult,
} from "@/components/Moderation/Dialogs/PublicationStaffModerationDialog";
import { AsyncConfirmDialog } from "@/components/Moderation/Dialogs/AsyncConfirmDialog";
import type {
  AsyncConfirmResult,
  CommentEditValues,
  StaffPublicationModTarget,
  VoxEditDraft,
} from "@/features/moderation/types";
import type { CommentPublic } from "@/lib/vox/types";
import { useAuthStore } from "@/features/auth/store";
import { commentHasPurgeableMedia } from "@/features/comments/purgeableMedia";
import { isAdminRole } from "@/lib/moderation/roles";
import { RecategorizeVoxDialog } from "@/components/Moderation/Dialogs/RecategorizeVoxDialog";
import { VoxDetailEditDialog } from "./VoxDetailEditDialog";
import { CommentEditDialog } from "@/components/Comments/Comment/CommentEditDialog";

type Props = {
  voxId: string;
  voxTitle: string;
  reportOpen: boolean;
  onReportOpenChange: (open: boolean) => void;
  reportCommentId: string | null;
  categoryDialogOpen: boolean;
  onCategoryDialogOpenChange: (open: boolean) => void;
  categoryValue: string;
  onCategoryChange: (value: string) => void;
  onRecategorizeSave: () => void | Promise<void>;
  editVoxDialogOpen: boolean;
  onEditVoxDialogOpenChange: (open: boolean) => void;
  editVoxDraft: VoxEditDraft;
  onEditVoxDraftChange: (draft: VoxEditDraft) => void;
  voxDescription: string;
  onEditVoxSave: (values: VoxEditDraft) => void | Promise<void>;
  publicationStaffModOpen: boolean;
  onPublicationStaffModOpenChange: (open: boolean) => void;
  publicationStaffModTarget: StaffPublicationModTarget | null;
  onPublicationStaffCompleted: (result: PublicationModerationResult) => void | Promise<void>;
  deleteCommentTarget: CommentPublic | null;
  onDeleteCommentDialogOpenChange: (open: boolean) => void;
  confirmModeratorDeleteComment: (result: AsyncConfirmResult) => Promise<void>;
  editCommentTarget: CommentPublic | null;
  onEditCommentDialogOpenChange: (open: boolean) => void;
  voxIsOwner: boolean;
  onEditCommentSave: (commentId: string, values: CommentEditValues) => Promise<void>;
};

export const VoxDetailDialogs = ({
  voxId,
  voxTitle,
  reportOpen,
  onReportOpenChange,
  reportCommentId,
  categoryDialogOpen,
  onCategoryDialogOpenChange,
  categoryValue,
  onCategoryChange,
  onRecategorizeSave,
  editVoxDialogOpen,
  onEditVoxDialogOpenChange,
  editVoxDraft,
  onEditVoxDraftChange,
  voxDescription,
  onEditVoxSave,
  publicationStaffModOpen,
  onPublicationStaffModOpenChange,
  publicationStaffModTarget,
  onPublicationStaffCompleted,
  deleteCommentTarget,
  onDeleteCommentDialogOpenChange,
  confirmModeratorDeleteComment,
  editCommentTarget,
  onEditCommentDialogOpenChange,
  voxIsOwner,
  onEditCommentSave,
}: Props) => {
  const viewerIsAdmin = useAuthStore((s) => isAdminRole(s.user?.role));
  return (
    <>
      <ReportEntityDialog
        open={reportOpen}
        onOpenChange={onReportOpenChange}
        voxId={voxId}
        voxTitle={voxTitle}
        commentId={reportCommentId}
      />
      <RecategorizeVoxDialog
        open={categoryDialogOpen}
        onOpenChange={onCategoryDialogOpenChange}
        categoryValue={categoryValue}
        onCategoryChange={onCategoryChange}
        onSave={onRecategorizeSave}
      />
      <VoxDetailEditDialog
        open={editVoxDialogOpen}
        onOpenChange={onEditVoxDialogOpenChange}
        draft={editVoxDraft}
        onDraftChange={onEditVoxDraftChange}
        savedTitle={voxTitle}
        savedDescription={voxDescription}
        onSave={onEditVoxSave}
      />
      <CommentEditDialog
        comment={editCommentTarget}
        onOpenChange={onEditCommentDialogOpenChange}
        voxIsOwner={voxIsOwner}
        onSave={onEditCommentSave}
      />
      <PublicationStaffModerationDialog
        open={publicationStaffModOpen}
        onOpenChange={onPublicationStaffModOpenChange}
        target={publicationStaffModTarget}
        onCompleted={onPublicationStaffCompleted}
      />
      <AsyncConfirmDialog
        open={deleteCommentTarget !== null}
        onOpenChange={onDeleteCommentDialogOpenChange}
        title="Eliminar comentario"
        description="¿Eliminar este comentario? Los usuarios dejarán de verlo."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        confirmVariant="destructive"
        successMessage="Comentario eliminado."
        showPurgePublicationMedia={
          deleteCommentTarget !== null && commentHasPurgeableMedia(deleteCommentTarget)
        }
        canBlockPublicationMedia={viewerIsAdmin}
        onConfirm={confirmModeratorDeleteComment}
      />
    </>
  );
};
