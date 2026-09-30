import { unlink } from "fs/promises";
import path from "path";
import { readdir } from "fs/promises";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  absolutePathForLocalPublicUpload,
  isLocalPublicUploadPath,
  isManagedPublicUploadUrl,
  isR2PublicUploadUrl,
} from "@/server/media/uploadUrls";
import { isR2StorageFullyConfigured } from "@/server/storage/r2Env";
import { deleteR2ObjectByKey, iterateR2UploadsUnderPrefix } from "@/server/storage/r2Storage";
import { fetchReferencedUploadUrlSet } from "@/server/media/referencedUploadUrls";
import { DAY_MS } from "@/lib/time";

export const countUploadUrlRefsInDb = async (db: PrismaClient, url: string): Promise<number> => {
  if (!url) return 0;
  const [voxCount, commentCount] = await Promise.all([
    db.vox.count({
      where: { OR: [{ mediaUrl: url }, { thumbnailUrl: url }] },
    }),
    db.comment.count({
      where: {
        OR: [{ imageUrl: url }, { videoUrl: url }, { videoPosterUrl: url }],
      },
    }),
  ]);
  return voxCount + commentCount;
};

const deleteManagedStoredFile = async (url: string): Promise<void> => {
  if (!isManagedPublicUploadUrl(url)) return;
  if (isR2PublicUploadUrl(url)) {
    if (!isR2StorageFullyConfigured()) return;
    try {
      const u = new URL(url);
      const key = u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
      await deleteR2ObjectByKey(key);
    } catch {
      /* best-effort */
    }
    return;
  }
  const abs = absolutePathForLocalPublicUpload(url);
  if (!abs) return;
  try {
    await unlink(abs);
  } catch {
    /* best-effort */
  }
};

/** An upload or dedupe newer than this may belong to a draft that is not published yet. */
export const STORED_MEDIA_SWEEP_GRACE_MS = DAY_MS;
const STORED_MEDIA_SWEEP_BATCH_MAX = 100;

const isRecentlyUsedStoredMediaUrl = async (
  db: PrismaClient,
  url: string,
  cutoff: Date,
): Promise<boolean> => {
  const row = await db.storedMediaByHash.findFirst({
    where: { OR: [{ mediaUrl: url }, { thumbnailUrl: url }], lastUsedAt: { gte: cutoff } },
    select: { id: true },
  });
  return row !== null;
};

export const cleanupManagedUploadUrlsIfUnreferenced = async (
  urls: readonly string[],
  db: PrismaClient = prisma,
  now: Date = new Date(),
): Promise<void> => {
  const cutoff = new Date(now.getTime() - STORED_MEDIA_SWEEP_GRACE_MS);
  const unique = [...new Set(urls)];
  for (const url of unique) {
    if (!isManagedPublicUploadUrl(url)) continue;
    const n = await countUploadUrlRefsInDb(db, url);
    if (n > 0) continue;
    if (await isRecentlyUsedStoredMediaUrl(db, url, cutoff)) continue;
    await deleteManagedStoredFile(url);
  }
  await sweepUnreferencedStoredMediaByHashRows(db, now);
};

/**
 * Moderation purge: deletes the objects now, without the draft grace period, because the staff
 * decided those bytes must go offline and a grace period would keep them public.
 *
 * The dedupe row depends on the mode:
 * - without `blockHashes` it is deleted: `sha256Hex` is unique and `recordStoredMediaByHash` keeps an
 *   existing row's URL, so a surviving row would point at the deleted object forever;
 * - with `blockHashes` it is kept with `blockedAt`, the only record of the hash once the file is
 *   gone. Uploads refuse blocked hashes before recording (`lookupStoredMediaByHash`) and the sweep
 *   skips them.
 */
export const purgeManagedUploadUrlsNow = async (
  urls: readonly string[],
  db: PrismaClient = prisma,
  options: { blockHashes?: boolean; now?: Date } = {},
): Promise<{ blockedHashes: number }> => {
  const now = options.now ?? new Date();
  let blockedHashes = 0;
  for (const url of new Set(urls)) {
    if (!isManagedPublicUploadUrl(url)) continue;
    // Another live publication may share the file through dedupe; that one keeps it.
    if ((await countUploadUrlRefsInDb(db, url)) > 0) continue;
    const rowsPointingAtFile = { OR: [{ mediaUrl: url }, { thumbnailUrl: url }] };
    if (options.blockHashes) {
      const blocked = await db.storedMediaByHash.updateMany({
        where: { ...rowsPointingAtFile, blockedAt: null },
        data: { blockedAt: now },
      });
      blockedHashes += blocked.count;
    } else {
      await db.storedMediaByHash.deleteMany({ where: rowsPointingAtFile });
    }
    await deleteManagedStoredFile(url);
  }
  return { blockedHashes };
};

type SweepCandidateRow = { id: string; mediaUrl: string; thumbnailUrl: string };

/** Deletes, in batch, dedupe rows (and their files) that nothing references or used recently. */
export const sweepUnreferencedStoredMediaByHashRows = async (
  db: PrismaClient = prisma,
  now: Date = new Date(),
  batchMax: number = STORED_MEDIA_SWEEP_BATCH_MAX,
): Promise<number> => {
  const cutoff = new Date(now.getTime() - STORED_MEDIA_SWEEP_GRACE_MS);
  const rows = await db.$queryRaw<SweepCandidateRow[]>`
    SELECT s.id, s."mediaUrl", s."thumbnailUrl"
    FROM "StoredMediaByHash" s
    WHERE s."blockedAt" IS NULL
      AND s."lastUsedAt" < ${cutoff}
      AND NOT EXISTS (
        SELECT 1 FROM "Vox" v
        WHERE v."mediaUrl" IN (s."mediaUrl", NULLIF(s."thumbnailUrl", '/video-thumb.svg'))
           OR v."thumbnailUrl" IN (s."mediaUrl", NULLIF(s."thumbnailUrl", '/video-thumb.svg'))
      )
      AND NOT EXISTS (
        SELECT 1 FROM "Comment" c
        WHERE c."imageUrl" IN (s."mediaUrl", NULLIF(s."thumbnailUrl", '/video-thumb.svg'))
           OR c."videoUrl" IN (s."mediaUrl", NULLIF(s."thumbnailUrl", '/video-thumb.svg'))
           OR c."videoPosterUrl" IN (s."mediaUrl", NULLIF(s."thumbnailUrl", '/video-thumb.svg'))
      )
    ORDER BY s."lastUsedAt" ASC
    LIMIT ${batchMax}
  `;
  let deleted = 0;
  for (const row of rows) {
    // A dedupe that renewed `lastUsedAt` after the query keeps its row.
    const claimed = await db.storedMediaByHash.deleteMany({
      where: { id: row.id, lastUsedAt: { lt: cutoff } },
    });
    if (claimed.count === 0) continue;
    await deleteManagedStoredFile(row.mediaUrl);
    await deleteManagedStoredFile(row.thumbnailUrl);
    deleted += 1;
  }
  return deleted;
};

const UPLOADS_FS_ROOT = path.join(process.cwd(), "public", "uploads");

const walkLocalUploadFiles = async (
  dir: string,
  relSegments: string[],
  onFile: (publicPath: string, absPath: string) => Promise<void>,
): Promise<void> => {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const nextRel = [...relSegments, e.name];
    if (e.isDirectory()) {
      await walkLocalUploadFiles(path.join(dir, e.name), nextRel, onFile);
    } else if (e.isFile()) {
      const publicPath = `/uploads/${nextRel.join("/")}`;
      const abs = path.join(dir, e.name);
      await onFile(publicPath, abs);
    }
  }
};

export type OrphanPurgeReport = {
  storedMediaRowsDeleted: number;
  localFilesDeleted: number;
  bucketObjectsDeleted: number;
  dryRun: boolean;
};

const purgeOrphanLocalUploadFiles = async (
  referenced: ReadonlySet<string>,
  opts: { execute: boolean; log?: (msg: string) => void },
): Promise<number> => {
  const log = opts.log ?? (() => undefined);
  let n = 0;
  try {
    await walkLocalUploadFiles(UPLOADS_FS_ROOT, [], async (publicPath, absPath) => {
      if (!isLocalPublicUploadPath(publicPath)) return;
      if (referenced.has(publicPath)) return;
      log(opts.execute ? `unlink ${publicPath}` : `[dry-run] unlink ${publicPath}`);
      if (opts.execute) {
        try {
          await unlink(absPath);
          n += 1;
        } catch {
          /* best-effort */
        }
      } else {
        n += 1;
      }
    });
  } catch {
    log("Could not read public/uploads (does the folder exist?).");
  }
  return n;
};

const purgeOrphanStoredMediaByHash = async (
  db: PrismaClient,
  referenced: ReadonlySet<string>,
  opts: { execute: boolean; log?: (msg: string) => void },
): Promise<number> => {
  const log = opts.log ?? (() => undefined);
  let deleted = 0;
  const rows = await db.storedMediaByHash.findMany({
    where: { blockedAt: null },
    select: { id: true, mediaUrl: true, thumbnailUrl: true },
  });
  for (const row of rows) {
    const mUsed = referenced.has(row.mediaUrl);
    const tUsed = referenced.has(row.thumbnailUrl);
    if (mUsed || tUsed) continue;
    log(
      opts.execute
        ? `StoredMediaByHash ${row.id} (media and thumbnail unreferenced)`
        : `[dry-run] StoredMediaByHash ${row.id}`,
    );
    if (opts.execute) {
      await deleteManagedStoredFile(row.mediaUrl);
      await deleteManagedStoredFile(row.thumbnailUrl);
      try {
        await db.storedMediaByHash.delete({ where: { id: row.id } });
        deleted += 1;
      } catch {
        /* best-effort */
      }
    } else {
      deleted += 1;
    }
  }
  return deleted;
};

const purgeOrphanBucketUploads = async (
  referenced: ReadonlySet<string>,
  opts: { execute: boolean; log?: (msg: string) => void },
): Promise<number> => {
  const log = opts.log ?? (() => undefined);
  if (!isR2StorageFullyConfigured()) {
    log("R2 is not configured: skipping the bucket listing.");
    return 0;
  }
  let deleted = 0;
  for await (const { key, publicUrl } of iterateR2UploadsUnderPrefix("uploads/")) {
    if (!isR2PublicUploadUrl(publicUrl)) continue;
    if (referenced.has(publicUrl)) continue;
    log(opts.execute ? `r2 del ${publicUrl}` : `[dry-run] r2 del ${publicUrl}`);
    if (!opts.execute) {
      deleted += 1;
      continue;
    }
    try {
      await deleteR2ObjectByKey(key);
      deleted += 1;
    } catch {
      /* best-effort */
    }
  }
  return deleted;
};

export const runFullOrphanUploadStoragePurge = async (opts: {
  execute: boolean;
  log?: (msg: string) => void;
}): Promise<OrphanPurgeReport> => {
  const log = opts.log ?? console.log;
  const referenced = await fetchReferencedUploadUrlSet(prisma);
  log(`URLs referenced by vox and comments: ${referenced.size}`);
  const storedMediaRowsDeleted = await purgeOrphanStoredMediaByHash(prisma, referenced, {
    execute: opts.execute,
    log,
  });
  const localFilesDeleted = await purgeOrphanLocalUploadFiles(referenced, {
    execute: opts.execute,
    log,
  });
  const bucketObjectsDeleted = await purgeOrphanBucketUploads(referenced, {
    execute: opts.execute,
    log,
  });
  if (!opts.execute) {
    log("Dry run: nothing was deleted. Pass --execute to apply.");
  }
  return {
    storedMediaRowsDeleted,
    localFilesDeleted,
    bucketObjectsDeleted,
    dryRun: !opts.execute,
  };
};
