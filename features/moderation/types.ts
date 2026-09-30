export type StaffPublicationModTarget =
  | { kind: "vox"; voxId: string }
  | { kind: "comment"; voxId: string; commentId: string };

export type VoxEditDraft = { title: string; description: string };

export type CommentEditValues = {
  body: string;
  showStaffIdentity: boolean;
  showOpIdentity: boolean;
};

export type AsyncConfirmResult = {
  purgePublicationMedia: boolean;
  blockPublicationMedia: boolean;
};
