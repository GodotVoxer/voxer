import type { VoxPollPublic } from "@/lib/vox/types";

/** Merges a realtime `poll:updated` into the reader's state; the room-wide event never overwrites the reader's own vote. */
export const mergeRealtimePoll = (
  currentPoll: VoxPollPublic | null,
  incomingPoll: VoxPollPublic,
): VoxPollPublic => ({
  ...incomingPoll,
  viewerVoteOptionId: currentPoll?.viewerVoteOptionId ?? null,
});
