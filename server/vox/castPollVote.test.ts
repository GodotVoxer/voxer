import { beforeEach, describe, expect, it, vi } from "vitest";

import { castPollVote } from "./castPollVote";

const mocks = vi.hoisted(() => ({
  voxFindFirst: vi.fn(),
  optionFindFirst: vi.fn(),
  voteCreate: vi.fn(),
  voteFindUnique: vi.fn(),
  getPollPayloadForVox: vi.fn(),
  emitToVoxRoom: vi.fn(),
  after: vi.fn((fn: () => unknown) => {
    void fn();
  }),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    vox: { findFirst: mocks.voxFindFirst },
    voxPollOption: { findFirst: mocks.optionFindFirst },
    voxPollVote: {
      create: mocks.voteCreate,
      findUnique: mocks.voteFindUnique,
    },
  },
}));

vi.mock("@/server/realtime/broadcast", () => ({
  emitToVoxRoom: mocks.emitToVoxRoom,
}));

vi.mock("@/server/vox/getPollPayloadForVox", () => ({
  getPollPayloadForVox: mocks.getPollPayloadForVox,
}));

vi.mock("next/server", () => ({
  after: mocks.after,
}));

describe("castPollVote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not_found when the vox is missing or deleted", async () => {
    mocks.voxFindFirst.mockResolvedValueOnce(null);
    const res = await castPollVote("vox-1", "user-1", "opt-1");
    expect(res).toEqual({ ok: false, kind: "not_found" });
    expect(mocks.emitToVoxRoom).not.toHaveBeenCalled();
  });

  it("returns no_poll when the vox has no active poll", async () => {
    mocks.voxFindFirst.mockResolvedValueOnce({ id: "vox-1", hasPoll: false });
    const res = await castPollVote("vox-1", "user-1", "opt-1");
    expect(res).toEqual({ ok: false, kind: "no_poll" });
  });

  it("returns invalid_option when the option is not the vox's", async () => {
    mocks.voxFindFirst.mockResolvedValueOnce({ id: "vox-1", hasPoll: true });
    mocks.optionFindFirst.mockResolvedValueOnce(null);
    const res = await castPollVote("vox-1", "user-1", "opt-wrong");
    expect(res).toEqual({ ok: false, kind: "invalid_option" });
  });

  it("returns already_voted when the user voted before", async () => {
    mocks.voxFindFirst.mockResolvedValueOnce({ id: "vox-1", hasPoll: true });
    mocks.optionFindFirst.mockResolvedValueOnce({ id: "opt-1", pollId: "poll-1" });
    mocks.voteCreate.mockRejectedValueOnce(new Error("Unique constraint violation"));
    mocks.voteFindUnique.mockResolvedValueOnce({ id: "vote-existing" });

    const res = await castPollVote("vox-1", "user-1", "opt-1");
    expect(res).toEqual({
      ok: false,
      kind: "already_voted",
      message: "Ya votaste en esta encuesta.",
    });
    expect(mocks.emitToVoxRoom).not.toHaveBeenCalled();
  });

  it("records the vote, returns the voter's payload and broadcasts with viewerVoteOptionId null", async () => {
    mocks.voxFindFirst.mockResolvedValueOnce({ id: "vox-1", hasPoll: true });
    mocks.optionFindFirst.mockResolvedValueOnce({ id: "opt-1", pollId: "poll-1" });
    mocks.voteCreate.mockResolvedValueOnce({ id: "vote-new" });

    const userPollPayload = {
      options: [
        { id: "opt-1", label: "Opción 1", sortOrder: 0 },
        { id: "opt-2", label: "Opción 2", sortOrder: 1 },
      ],
      tallies: [
        { optionId: "opt-1", count: 1, percent: 100 },
        { optionId: "opt-2", count: 0, percent: 0 },
      ],
      totalVotes: 1,
      viewerVoteOptionId: "opt-1",
    };
    mocks.getPollPayloadForVox.mockResolvedValueOnce(userPollPayload);

    const res = await castPollVote("vox-1", "user-1", "opt-1");

    expect(res).toEqual({ ok: true, poll: userPollPayload });
    expect(mocks.emitToVoxRoom).toHaveBeenCalledTimes(1);
    expect(mocks.emitToVoxRoom).toHaveBeenCalledWith("vox-1", "poll:updated", {
      ...userPollPayload,
      viewerVoteOptionId: null,
    });
  });
});
