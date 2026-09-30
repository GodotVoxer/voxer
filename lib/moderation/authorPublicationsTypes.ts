export type ModerationAuthorPublicationVox = {
  kind: "vox";
  id: string;
  createdAt: string;
  category: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  mediaType: string;
};

export type ModerationAuthorPublicationComment = {
  kind: "comment";
  id: string;
  createdAt: string;
  category: string;
  voxId: string;
  voxTitle: string;
  bodyPreview: string;
  publicTag: string;
  imageUrl: string | null;
  videoUrl: string | null;
  videoPosterUrl: string | null;
};

export type ModerationAuthorPublicationItem =
  | ModerationAuthorPublicationVox
  | ModerationAuthorPublicationComment;

export type AuthorPublicationsAnchor =
  | { kind: "vox"; voxId: string }
  | { kind: "comment"; commentId: string };

export type ModerationAuthorPublicationsPage = {
  anchor: AuthorPublicationsAnchor;
  authorLinked: boolean;
  items: ModerationAuthorPublicationItem[];
  nextCursor: string | null;
};
