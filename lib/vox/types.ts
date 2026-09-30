/** Home, hidden, favorites or the user's own vox. */
export type VoxListView = "default" | "hidden" | "favorites" | "mine";
export type MediaType = "IMAGE" | "UPLOADED_VIDEO" | "YOUTUBE";
export type AvatarVariant =
  | "BLUE"
  | "GREEN"
  | "RED"
  | "YELLOW"
  | "PINK"
  | "BROWN"
  | "MULTICOLOR"
  | "MULTICOLOR_INVERTED"
  | "WHITE"
  | "BLACK";
export type VoxListItem = {
  id: string;
  title: string;
  category: string;
  thumbnailUrl: string | null;
  /** Animated cover (GIF or GIF converted to MP4), played in the grid on hover or pin. */
  coverGifUrl: string | null;
  /** The animated cover is an MP4, so `VoxCard` renders `<video>` instead of `<img>`. */
  animatedImage: boolean;
  mediaType: MediaType;
  replies: number;
  createdAt: string;
  /** False without a session. */
  favorited: boolean;
  hasPoll: boolean;
  /** Set by admins; the main list sorts pinned vox first. */
  pinnedAt: string | null;
};

export type VoxListPage = {
  items: VoxListItem[];
  nextCursor: string | null;
  hasMore: boolean;
};
type VoxPollOptionPublic = {
  id: string;
  label: string;
  sortOrder: number;
};
type VoxPollTallyPublic = {
  optionId: string;
  count: number;
  /** 0-100 with two decimals. */
  percent: number;
};
export type VoxPollPublic = {
  options: VoxPollOptionPublic[];
  tallies: VoxPollTallyPublic[];
  totalVotes: number;
  viewerVoteOptionId: string | null;
};
export type VoxDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  mediaType: MediaType;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  /** `mediaUrl` is a GIF converted to MP4: played looped, muted and without controls. */
  animatedImage: boolean;
  youtubeVideoId: string | null;
  createdAt: string;
  updatedAt: string;
  following: boolean;
  hidden: boolean;
  favorited: boolean;
  isOwner: boolean;
  threadUniqueIdsEnabled: boolean;
  countryFlagsEnabled: boolean;
  /** The `poll` payload is fetched separately from `GET /api/vox/[id]/poll`. */
  hasPoll: boolean;
  poll: VoxPollPublic | null;
};
export type CommentStaffBadge = "MOD" | "ADMIN";
export type CommentThreadTagPublic = {
  text: string;
  badgeHue: number;
};
/** Client-side comment: no user id; `displayName` is a public pseudonym. */
export type CommentPublic = {
  id: string;
  publicTag: string;
  body: string;
  displayName: string;
  imageUrl: string | null;
  videoUrl: string | null;
  videoPosterUrl: string | null;
  /** `videoUrl` is a GIF converted to MP4: played looped, muted and without controls. */
  animatedImage?: boolean;
  avatarVariant: AvatarVariant;
  /** Staff member who chose to show their username. */
  staffBadge?: CommentStaffBadge | null;
  isOp: boolean;
  createdAt: string;
  threadTag?: CommentThreadTagPublic | null;
  countryCode?: string | null;
  pollVoteLabel?: string | null;
  pollVoteHue?: number | null;
  /** Posted with the current session (the user id is never exposed). */
  isMine: boolean;
  /** Own comment with reply notifications muted. */
  repliesMuted?: boolean;
  /** Set when the vox owner pinned it: shown again above the thread, newest pin first. */
  pinnedAt?: string | null;
};
