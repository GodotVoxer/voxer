import { prisma } from "@/server/db/prisma";
import { isR2StorageFullyConfigured } from "@/server/storage/r2Env";
import { r2PublicUrlForKey } from "@/lib/media/publicStorage";
import { deleteR2ObjectByKey } from "@/server/storage/r2Storage";
import { HOUR_MS } from "@/lib/time";

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

export const verifyBlobFinalizeAuthorization = async (
  pathname: string,
  userId: string,
): Promise<boolean> => {
  await pruneExpiredBlobPendingFinalizes();
  const row = await prisma.blobPendingPutFinalize.findUnique({
    where: { pathname },
  });
  return Boolean(row && row.userId === userId && row.expiresAt.getTime() >= Date.now());
};

export const releaseBlobFinalizeSlot = async (pathname: string, userId: string): Promise<void> => {
  await prisma.blobPendingPutFinalize.deleteMany({
    where: { pathname, userId },
  });
};

/**
 * Successful finalize: the result lives under another key and the original is no longer needed.
 * If deleting it fails the slot stays and the prune retries. Never throws.
 */
export const completeBlobUpload = async (pathname: string, userId: string): Promise<void> => {
  try {
    if (isR2StorageFullyConfigured()) await deleteR2ObjectByKey(pathname);
    await releaseBlobFinalizeSlot(pathname, userId);
  } catch (e) {
    console.error("[blob-finalize] could not delete the original upload:", e);
  }
};

/** Rejected or deduplicated finalize: the uploaded object is deleted and the slot released. */
export const discardBlobUpload = async (pathname: string, userId: string): Promise<void> => {
  await Promise.allSettled([
    isR2StorageFullyConfigured() ? deleteR2ObjectByKey(pathname) : Promise.resolve(),
    releaseBlobFinalizeSlot(pathname, userId),
  ]);
};
