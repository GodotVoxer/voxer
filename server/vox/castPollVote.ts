import { after } from "next/server";
import { prisma } from "@/server/db/prisma";
import { emitToVoxRoom } from "@/server/realtime/broadcast";
import { getPollPayloadForVox } from "@/server/vox/getPollPayloadForVox";
import type { VoxPollPublic } from "@/lib/vox/types";

export type CastPollVoteResult =
  | { ok: true; poll: VoxPollPublic }
  | {
      ok: false;
      kind: "not_found" | "no_poll" | "invalid_option" | "already_voted" | "unauthorized";
      message?: string;
    };

export const castPollVote = async (
  voxId: string,
  userId: string,
  optionId: string,
): Promise<CastPollVoteResult> => {
  const vox = await prisma.vox.findFirst({
    where: { id: voxId, deletedAt: null },
    select: { id: true, hasPoll: true },
  });
  if (!vox) return { ok: false, kind: "not_found" };
  if (!vox.hasPoll) return { ok: false, kind: "no_poll" };

  const option = await prisma.voxPollOption.findFirst({
    where: { id: optionId, poll: { voxId } },
    select: { id: true, pollId: true },
  });
  if (!option) return { ok: false, kind: "invalid_option" };

  try {
    await prisma.voxPollVote.create({
      data: {
        userId,
        pollId: option.pollId,
        optionId: option.id,
      },
    });
  } catch {
    const existing = await prisma.voxPollVote.findUnique({
      where: { userId_pollId: { userId, pollId: option.pollId } },
      select: { id: true },
    });
    if (existing) {
      return {
        ok: false,
        kind: "already_voted",
        message: "Ya votaste en esta encuesta.",
      };
    }
    return { ok: false, kind: "invalid_option" };
  }

  const poll = await getPollPayloadForVox(voxId, userId);
  if (!poll) return { ok: false, kind: "no_poll" };

  const roomPoll: VoxPollPublic = {
    ...poll,
    viewerVoteOptionId: null,
  };

  after(async () => {
    await emitToVoxRoom(voxId, "poll:updated", roomPoll);
  });

  return { ok: true, poll };
};
