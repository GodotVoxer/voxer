import type { PrismaClient } from "@prisma/client";
import { PUSH_DEVICE_FAILURE_MAX, PUSH_DEVICE_STALE_MS } from "@/server/push/constants";

/** Devices that have not registered since this moment are considered abandoned. */
export const stalePushDeviceCutoff = (now: Date): Date =>
  new Date(now.getTime() - PUSH_DEVICE_STALE_MS);

/**
 * Safety net for the reactive cleanup `sendPushToUserIds` already does on `UNREGISTERED`: removes
 * devices that never receive anything (inactive users) and those that pile up non-fatal failures.
 * Best-effort and idempotent.
 */
export const purgeStalePushDevices = async (
  db: PrismaClient,
  now: Date,
  batchMax: number,
): Promise<number> => {
  const cutoff = stalePushDeviceCutoff(now);
  const stale = await db.pushDevice.findMany({
    where: {
      OR: [{ lastSeenAt: { lte: cutoff } }, { failureCount: { gte: PUSH_DEVICE_FAILURE_MAX } }],
    },
    take: batchMax,
    orderBy: { lastSeenAt: "asc" },
    select: { id: true },
  });
  if (stale.length === 0) return 0;
  const r = await db.pushDevice.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  return r.count;
};
