import type { VoxPollPublic } from "@/lib/vox/types";
import { prisma } from "@/server/db/prisma";

const roundPercent = (count: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.round((count / total) * 10_000) / 100;
};

export const getPollPayloadForVox = async (
  voxId: string,
  sessionUserId: string | null,
): Promise<VoxPollPublic | null> => {
  const poll = await prisma.voxPoll.findUnique({
    where: { voxId },
    include: {
      options: {
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { votes: true } } },
      },
      ...(sessionUserId
        ? {
            votes: {
              where: { userId: sessionUserId },
              take: 1,
              select: { optionId: true },
            },
          }
        : {}),
    },
  });
  if (!poll) return null;
  const pollRow = poll as typeof poll & { votes?: { optionId: string }[] };
  const viewerVoteOptionId = pollRow.votes?.[0]?.optionId ?? null;
  const counts = poll.options.map((o) => o._count.votes);
  const totalVotes = counts.reduce((a, b) => a + b, 0);
  const tallies = poll.options.map((o) => ({
    optionId: o.id,
    count: o._count.votes,
    percent: roundPercent(o._count.votes, totalVotes),
  }));
  return {
    options: poll.options.map((o) => ({
      id: o.id,
      label: o.label,
      sortOrder: o.sortOrder,
    })),
    tallies,
    totalVotes,
    viewerVoteOptionId,
  };
};
