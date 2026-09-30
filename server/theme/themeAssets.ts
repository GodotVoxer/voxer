import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { ThemeAssetDto, ThemeAssetQuota } from "@/lib/theme/customTheme";
import {
  THEME_BG_ASSETS_PER_USER_MAX,
  THEME_BG_ORPHAN_GRACE_MS,
  THEME_BG_ORPHAN_PURGE_BATCH_MAX,
  THEME_BG_TOTAL_BYTES_MAX,
} from "@/lib/theme/themeBackgroundLimits";
import type { ProcessedBackgroundImage } from "@/server/theme/processBackgroundImage";
import {
  deleteThemeAssetObject,
  newThemeAssetKeys,
  putThemeAssetObject,
  readThemeAssetObject,
  themeAssetPublicUrl,
} from "@/server/theme/themeAssetStorage";

const THEME_ASSET_SELECT = {
  id: true,
  objectKey: true,
  objectKeySm: true,
  width: true,
  height: true,
  byteSize: true,
  createdAt: true,
} satisfies Prisma.UserThemeAssetSelect;

type ThemeAssetRow = Prisma.UserThemeAssetGetPayload<{ select: typeof THEME_ASSET_SELECT }>;

const themeAssetDtoFromRow = (row: ThemeAssetRow): ThemeAssetDto => ({
  id: row.id,
  url: themeAssetPublicUrl(row.objectKey),
  urlSm: themeAssetPublicUrl(row.objectKeySm),
  width: row.width,
  height: row.height,
  byteSize: row.byteSize,
  createdAt: row.createdAt.toISOString(),
});

const quotaFor = (count: number, bytes: number): ThemeAssetQuota => ({
  count,
  maxCount: THEME_BG_ASSETS_PER_USER_MAX,
  bytes,
  maxBytes: THEME_BG_TOTAL_BYTES_MAX,
});

export const listThemeAssets = async (
  userId: string,
): Promise<{ assets: ThemeAssetDto[]; quota: ThemeAssetQuota }> => {
  const rows = await prisma.userThemeAsset.findMany({
    where: { userId },
    select: THEME_ASSET_SELECT,
    orderBy: { createdAt: "desc" },
  });
  const bytes = rows.reduce((sum, row) => sum + row.byteSize, 0);
  return { assets: rows.map(themeAssetDtoFromRow), quota: quotaFor(rows.length, bytes) };
};

export const createThemeAssetShare = async (
  userId: string,
  assetId: string,
): Promise<string | null> => {
  const asset = await prisma.userThemeAsset.findFirst({
    where: { id: assetId, userId },
    select: { id: true, shareId: true },
  });
  if (!asset) return null;
  if (asset.shareId) return asset.shareId;
  const shareId = randomBytes(24).toString("base64url");
  await prisma.userThemeAsset.updateMany({
    where: { id: asset.id, userId, shareId: null },
    data: { shareId },
  });
  const updated = await prisma.userThemeAsset.findFirst({
    where: { id: asset.id, userId },
    select: { shareId: true },
  });
  return updated?.shareId ?? null;
};

export type ImportSharedThemeAssetResult =
  | { ok: true; asset: ThemeAssetDto; deduplicated: boolean }
  | { ok: false; reason: "not_found" | "blocked" | "quota_count" | "quota_bytes" };

/** Copies a shared image to the receiving account; never trusts keys or URLs sent by the client. */
export const importSharedThemeAsset = async (
  userId: string,
  shareId: string,
): Promise<ImportSharedThemeAssetResult> => {
  const source = await prisma.userThemeAsset.findUnique({
    where: { shareId },
    select: {
      id: true,
      userId: true,
      objectKey: true,
      objectKeySm: true,
      width: true,
      height: true,
      byteSize: true,
      sha256Hex: true,
      createdAt: true,
    },
  });
  if (!source) return { ok: false, reason: "not_found" };
  if (source.userId === userId) {
    return { ok: true, asset: themeAssetDtoFromRow(source), deduplicated: true };
  }
  const blocked = await prisma.storedMediaByHash.findFirst({
    where: { sha256Hex: source.sha256Hex, NOT: { blockedAt: null } },
    select: { id: true },
  });
  if (blocked) return { ok: false, reason: "blocked" };
  const existing = await prisma.userThemeAsset.findFirst({
    where: { userId, sha256Hex: source.sha256Hex },
    select: THEME_ASSET_SELECT,
  });
  if (existing) return { ok: true, asset: themeAssetDtoFromRow(existing), deduplicated: true };

  const usage = await prisma.userThemeAsset.aggregate({
    where: { userId },
    _count: { _all: true },
    _sum: { byteSize: true },
  });
  if (usage._count._all >= THEME_BG_ASSETS_PER_USER_MAX) {
    return { ok: false, reason: "quota_count" };
  }
  if ((usage._sum.byteSize ?? 0) + source.byteSize > THEME_BG_TOTAL_BYTES_MAX) {
    return { ok: false, reason: "quota_bytes" };
  }

  const [full, small] = await Promise.all([
    readThemeAssetObject(source.objectKey),
    readThemeAssetObject(source.objectKeySm),
  ]);
  const { key, keySm } = newThemeAssetKeys();
  const deleteObjects = () =>
    Promise.all([deleteThemeAssetObject(key), deleteThemeAssetObject(keySm)]);
  await Promise.all([putThemeAssetObject(key, full), putThemeAssetObject(keySm, small)]);
  let row: ThemeAssetRow;
  try {
    row = await prisma.userThemeAsset.create({
      data: {
        userId,
        objectKey: key,
        objectKeySm: keySm,
        byteSize: full.length + small.length,
        width: source.width,
        height: source.height,
        sha256Hex: source.sha256Hex,
      },
      select: THEME_ASSET_SELECT,
    });
  } catch (error) {
    await deleteObjects();
    throw error;
  }
  const usageAfter = await prisma.userThemeAsset.aggregate({
    where: { userId },
    _count: { _all: true },
    _sum: { byteSize: true },
  });
  const overCount = usageAfter._count._all > THEME_BG_ASSETS_PER_USER_MAX;
  if (overCount || (usageAfter._sum.byteSize ?? 0) > THEME_BG_TOTAL_BYTES_MAX) {
    await prisma.userThemeAsset.deleteMany({ where: { id: row.id } });
    await deleteObjects();
    return { ok: false, reason: overCount ? "quota_count" : "quota_bytes" };
  }
  return { ok: true, asset: themeAssetDtoFromRow(row), deduplicated: false };
};

export type SaveThemeAssetResult =
  | { ok: true; asset: ThemeAssetDto; deduplicated: boolean }
  | { ok: false; reason: "blocked" | "quota_count" | "quota_bytes" };

/**
 * Stores a processed image: rejects hashes blocked by moderation, reuses the user's identical image
 * (SHA-256 of the final WebP) and enforces the quota before writing to storage.
 */
export const saveThemeAsset = async (
  userId: string,
  processed: ProcessedBackgroundImage,
): Promise<SaveThemeAssetResult> => {
  const blocked = await prisma.storedMediaByHash.findFirst({
    where: {
      sha256Hex: { in: [processed.sha256Hex, processed.sourceSha256Hex] },
      NOT: { blockedAt: null },
    },
    select: { id: true },
  });
  if (blocked) return { ok: false, reason: "blocked" };

  const existing = await prisma.userThemeAsset.findFirst({
    where: { userId, sha256Hex: processed.sha256Hex },
    select: THEME_ASSET_SELECT,
  });
  if (existing) return { ok: true, asset: themeAssetDtoFromRow(existing), deduplicated: true };

  const usage = await prisma.userThemeAsset.aggregate({
    where: { userId },
    _count: { _all: true },
    _sum: { byteSize: true },
  });
  const byteSize = processed.full.length + processed.small.length;
  if (usage._count._all >= THEME_BG_ASSETS_PER_USER_MAX)
    return { ok: false, reason: "quota_count" };
  if ((usage._sum.byteSize ?? 0) + byteSize > THEME_BG_TOTAL_BYTES_MAX) {
    return { ok: false, reason: "quota_bytes" };
  }

  const { key, keySm } = newThemeAssetKeys();
  const deleteObjects = () =>
    Promise.all([deleteThemeAssetObject(key), deleteThemeAssetObject(keySm)]);
  await Promise.all([
    putThemeAssetObject(key, processed.full),
    putThemeAssetObject(keySm, processed.small),
  ]);
  let row: ThemeAssetRow;
  try {
    row = await prisma.userThemeAsset.create({
      data: {
        userId,
        objectKey: key,
        objectKeySm: keySm,
        byteSize,
        width: processed.width,
        height: processed.height,
        sha256Hex: processed.sha256Hex,
      },
      select: THEME_ASSET_SELECT,
    });
  } catch (error) {
    await deleteObjects();
    throw error;
  }

  // Concurrent uploads can pass the pre-check together: re-check with the row written and roll back.
  const usageAfter = await prisma.userThemeAsset.aggregate({
    where: { userId },
    _count: { _all: true },
    _sum: { byteSize: true },
  });
  const overCount = usageAfter._count._all > THEME_BG_ASSETS_PER_USER_MAX;
  if (overCount || (usageAfter._sum.byteSize ?? 0) > THEME_BG_TOTAL_BYTES_MAX) {
    await prisma.userThemeAsset.deleteMany({ where: { id: row.id } });
    await deleteObjects();
    return { ok: false, reason: overCount ? "quota_count" : "quota_bytes" };
  }
  return { ok: true, asset: themeAssetDtoFromRow(row), deduplicated: false };
};

/**
 * Deletes an own image. Themes using it go back to no background (with a new version, so other
 * devices adopt it) in the same transaction; the objects are removed afterwards.
 */
export const deleteThemeAsset = async (userId: string, assetId: string): Promise<boolean> => {
  const deleted = await prisma.$transaction(async (tx) => {
    const asset = await tx.userThemeAsset.findFirst({
      where: { id: assetId, userId },
      select: { id: true, objectKey: true, objectKeySm: true },
    });
    if (!asset) return null;
    await tx.userTheme.updateMany({
      where: { userId, backgroundAssetId: asset.id },
      data: {
        voxBackground: { kind: "none" },
        backgroundAssetId: null,
        version: { increment: 1 },
      },
    });
    await tx.userThemeAsset.delete({ where: { id: asset.id } });
    return asset;
  });
  if (!deleted) return false;
  await Promise.all([
    deleteThemeAssetObject(deleted.objectKey),
    deleteThemeAssetObject(deleted.objectKeySm),
  ]);
  return true;
};

/** User images no theme has used for longer than the grace period (bounded per run). */
export const purgeOrphanThemeAssets = async (userId: string, now = new Date()): Promise<number> => {
  const cutoff = new Date(now.getTime() - THEME_BG_ORPHAN_GRACE_MS);
  const candidates = await prisma.userThemeAsset.findMany({
    where: { userId, createdAt: { lt: cutoff }, themes: { none: {} } },
    select: { id: true, objectKey: true, objectKeySm: true },
    take: THEME_BG_ORPHAN_PURGE_BATCH_MAX,
  });
  let purged = 0;
  for (const asset of candidates) {
    // Re-checks "no themes" in the same DELETE: a theme may have picked it up since the read.
    const { count } = await prisma.userThemeAsset.deleteMany({
      where: { id: asset.id, themes: { none: {} } },
    });
    if (count === 0) continue;
    purged++;
    await Promise.all([
      deleteThemeAssetObject(asset.objectKey),
      deleteThemeAssetObject(asset.objectKeySm),
    ]);
  }
  return purged;
};
