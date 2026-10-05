import { prisma } from "@/server/db/prisma";
import { isR2StorageFullyConfigured } from "@/server/storage/r2Env";
import { r2PublicUrlForKey } from "@/lib/media/publicStorage";
import { deleteR2ObjectByKey } from "@/server/storage/r2Storage";
import { HOUR_MS } from "@/lib/time";

/** Outlives the signed PUT URL (15 min), so the prune also removes objects re-uploaded after a finalize. */
const TTL_MS = HOUR_MS;
const PRUNE_BATCH_MAX = 50;

const deleteObjectIfNeverFinalized = async (pathname: string): Promise<void> => {
  if (!isR2StorageFullyConfigured()) return;
  const url = r2PublicUrlForKey(pathname);
  const finalized = await prisma.storedMediaByHash.findFirst({
    where: { OR: [{ mediaUrl: url }, { thumbnailUrl: url }] },
    select: { id: true },
  });
  if (finalized) return;
  await deleteR2ObjectByKey(pathname);
};

/**
 * An expired slot is a direct upload that never finalized, or whose original could not be deleted:
 * the object still has its original bytes and metadata, so it is deleted with the row.
 */
export const pruneExpiredBlobPendingFinalizes = async (): Promise<void> => {
  const expired = await prisma.blobPendingPutFinalize.findMany({
    where: { expiresAt: { lt: new Date() } },
    select: { pathname: true },
    take: PRUNE_BATCH_MAX,
  });
  if (expired.length === 0) return;
  const results = await Promise.allSettled(
    expired.map((row) => deleteObjectIfNeverFinalized(row.pathname)),
  );
  const cleared = expired
    .filter((_, i) => results[i]?.status === "fulfilled")
    .map((row) => row.pathname);
  if (cleared.length === 0) return;
  await prisma.blobPendingPutFinalize.deleteMany({
    where: { pathname: { in: cleared } },
  });
};

export const registerBlobFinalizeSlot = async (pathname: string, userId: string): Promise<void> => {
  await pruneExpiredBlobPendingFinalizes();
  const expiresAt = new Date(Date.now() + TTL_MS);
  await prisma.blobPendingPutFinalize.upsert({
    where: { pathname },
    create: { pathname, userId, expiresAt },
    update: { userId, expiresAt },
  });
};

/**
 * Atomic: of two concurrent finalizes for the same upload only one wins. The row stays, marked
 * consumed, until it expires.
 */
export const claimBlobFinalizeSlot = async (pathname: string, userId: string): Promise<boolean> => {
  await pruneExpiredBlobPendingFinalizes();
  const now = new Date();
  const { count } = await prisma.blobPendingPutFinalize.updateMany({
    where: { pathname, userId, consumedAt: null, expiresAt: { gt: now } },
    data: { consumedAt: now },
  });
  return count === 1;
};

/** Deletes the uploaded original once the finalize ends, whatever the outcome. Never throws. */
export const deleteBlobOriginal = async (pathname: string): Promise<void> => {
  if (!isR2StorageFullyConfigured()) return;
  try {
    await deleteR2ObjectByKey(pathname);
  } catch (e) {
    console.error("[blob-finalize] could not delete the original upload:", e);
  }
};
