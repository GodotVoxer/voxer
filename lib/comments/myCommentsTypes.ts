export type MyCommentItem = {
  id: string;
  publicTag: string;
  body: string;
  createdAt: string;
  imageUrl: string | null;
  videoUrl: string | null;
  videoPosterUrl: string | null;
  animatedImage: boolean;
  pinned: boolean;
  voxId: string;
  voxTitle: string;
  voxCategory: string;
};

export type MyCommentsPage = {
  items: MyCommentItem[];
  nextCursor: string | null;
  hasMore: boolean;
};
