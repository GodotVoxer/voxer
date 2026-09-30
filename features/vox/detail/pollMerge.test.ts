import { describe, expect, it } from "vitest";
import type { VoxPollPublic } from "@/lib/vox/types";
import { mergeRealtimePoll } from "./pollMerge";

const mockPoll = (overrides?: Partial<VoxPollPublic>): VoxPollPublic => ({
  options: [
    { id: "opt-1", label: "Opción 1", sortOrder: 0 },
    { id: "opt-2", label: "Opción 2", sortOrder: 1 },
  ],
  tallies: [
    { optionId: "opt-1", count: 1, percent: 50 },
    { optionId: "opt-2", count: 1, percent: 50 },
  ],
  totalVotes: 2,
  viewerVoteOptionId: null,
  ...overrides,
});

describe("mergeRealtimePoll", () => {
  it("keeps viewerVoteOptionId when the current user had voted", () => {
    const current = mockPoll({ viewerVoteOptionId: "opt-1" });
    const incoming = mockPoll({
      totalVotes: 3,
      tallies: [
        { optionId: "opt-1", count: 1, percent: 33.33 },
        { optionId: "opt-2", count: 2, percent: 66.67 },
      ],
      viewerVoteOptionId: null,
    });

    const result = mergeRealtimePoll(current, incoming);

    expect(result.viewerVoteOptionId).toBe("opt-1");
    expect(result.totalVotes).toBe(3);
    expect(result.tallies[1].count).toBe(2);
  });

  it("keeps viewerVoteOptionId null when the reader had not voted", () => {
    const current = mockPoll({ viewerVoteOptionId: null });
    const incoming = mockPoll({
      totalVotes: 3,
      viewerVoteOptionId: null,
    });

    const result = mergeRealtimePoll(current, incoming);

    expect(result.viewerVoteOptionId).toBeNull();
    expect(result.totalVotes).toBe(3);
  });

  it("is not fooled by a room payload carrying someone else's viewerVoteOptionId", () => {
    const current = mockPoll({ viewerVoteOptionId: null });
    const incomingWithForeignVote = mockPoll({
      totalVotes: 3,
      viewerVoteOptionId: "opt-2",
    });

    const result = mergeRealtimePoll(current, incomingWithForeignVote);

    expect(result.viewerVoteOptionId).toBeNull();
  });

  it("returns viewerVoteOptionId null when currentPoll is null", () => {
    const incoming = mockPoll({ totalVotes: 5 });
    const result = mergeRealtimePoll(null, incoming);

    expect(result.viewerVoteOptionId).toBeNull();
    expect(result.totalVotes).toBe(5);
  });
});
