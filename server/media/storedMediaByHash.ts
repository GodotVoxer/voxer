import type { StoredMediaKind } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export type StoredMediaDedupeRow = {
  kind: StoredMediaKind;
  mediaUrl: string;
  thumbnailUrl: string;
};

/** Renews the grace period: the file may belong to a draft that is not published yet. */
const touchStoredMediaLastUsed = async (sha256Hex: string): Promise<void> => {
  await prisma.storedMediaByHash.updateMany({
    where: { sha256Hex },
    data: { lastUsedAt: new Date() },
  });
};

/**
 * One query for both upload checks. A blocking purge keeps the row as a tombstone (`blockedAt`) so
 * the hash outlives the deleted file and later uploads of the same bytes are refused; a re-encoded
 * or cropped copy has another hash and still goes through. An active row is a dedupe hit and has
 * its grace period renewed.
 */
export const lookupStoredMediaByHash = async (
  sha256Hex: string,
): Promise<"blocked" | StoredMediaDedupeRow | null> => {
  const normalized = sha256Hex.toLowerCase();
  const row = await prisma.storedMediaByHash.findFirst({
    where: { sha256Hex: normalized },
    select: { kind: true, mediaUrl: true, thumbnailUrl: true, blockedAt: true },
  });
  if (!row) return null;
  if (row.blockedAt) return "blocked";
  await touchStoredMediaLastUsed(normalized);
  return { kind: row.kind, mediaUrl: row.mediaUrl, thumbnailUrl: row.thumbnailUrl };
};

/** Points an existing row at a new thumbnail, e.g. a poster generated for it later. */
export const updateStoredMediaThumbnail = async (
  sha256Hex: string,
  thumbnailUrl: string,
): Promise<void> => {
  await prisma.storedMediaByHash.updateMany({
    where: { sha256Hex: sha256Hex.toLowerCase() },
    data: { thumbnailUrl },
  });
};

export const recordStoredMediaByHash = async (arg: {
  sha256Hex: string;
  kind: StoredMediaKind;
  mediaUrl: string;
  thumbnailUrl: string;
  byteSize: number;
  mimeType: string | null;
}): Promise<void> => {
  const sha256Hex = arg.sha256Hex.toLowerCase();
  try {
    await prisma.storedMediaByHash.create({
      data: {
        sha256Hex,
        kind: arg.kind,
        mediaUrl: arg.mediaUrl,
        thumbnailUrl: arg.thumbnailUrl,
        byteSize: arg.byteSize,
        mimeType: arg.mimeType ? arg.mimeType.slice(0, 120) : null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      await touchStoredMediaLastUsed(sha256Hex);
      return;
    }
    throw e;
  }
};
