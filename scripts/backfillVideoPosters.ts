/**
 * Generates thumbnails for uploaded videos that lack one: `Vox` with `mediaType = UPLOADED_VIDEO` and
 * no thumbnail (or the placeholder), and `Comment` with a native `videoUrl` and no poster.
 *
 * Needs `DATABASE_URL`, ffmpeg (`ffmpeg-static` or `FFMPEG_PATH`) and, to read `/uploads/...` over
 * HTTP, `SITE_URL` or `NEXT_PUBLIC_APP_URL`.
 *
 *   npm run db:backfill-video-posters [-- --execute [--limit N] [--comments-only | --vox-only]]
 *
 * Dry run by default.
 */
import "./loadScriptEnv";
import { readFile } from "fs/promises";
import { prisma } from "@/server/db/prisma";
import { extractVideoPosterPngBuffer } from "@/server/media/extractVideoPosterFrame";
import { saveImageWithThumb } from "@/server/media/imageProcess";
import {
  absolutePathForLocalPublicUpload,
  isLocalPublicUploadPath,
} from "@/server/media/uploadUrls";
import { isYoutubeEmbedUrl } from "@/lib/media/youtube";

const readFlag = (name: string): boolean => process.argv.includes(`--${name}`);

const readNumericFlag = (name: string): number | undefined => {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  const n = Number(process.argv[idx + 1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
};

const requireSiteBase = (): string => {
  const u = process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!u) {
    throw new Error(
      "Set SITE_URL or NEXT_PUBLIC_APP_URL (e.g. http://localhost:3000) to fetch remote /uploads/... URLs.",
    );
  }
  return u.replace(/\/+$/, "");
};

const toAbsoluteUrl = (raw: string, site: string): string => {
  const t = raw.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("/")) return `${site}${t}`;
  return t;
};

const extensionFromUrl = (u: string): string => {
  const pathOnly = u.split("?")[0]?.split("#")[0] ?? "";
  const m = pathOnly.match(/\.([a-zA-Z0-9]+)$/);
  return (m?.[1] ?? "mp4").toLowerCase();
};

const readUploadBytes = async (url: string, site: string): Promise<Buffer> => {
  if (isLocalPublicUploadPath(url)) {
    const disk = absolutePathForLocalPublicUpload(url);
    if (!disk) {
      throw new Error(`Invalid local path: ${url}`);
    }
    return readFile(disk);
  }
  const abs = toAbsoluteUrl(url, site);
  const res = await fetch(abs, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`GET ${abs} → ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
};

const needsGenericVoxThumb = (t: string | null): boolean =>
  t == null || t.trim() === "" || t.trim() === "/video-thumb.svg";

const main = async () => {
  const execute = readFlag("execute");
  const commentsOnly = readFlag("comments-only");
  const voxOnly = readFlag("vox-only");
  const limit = readNumericFlag("limit");
  const site = execute ? requireSiteBase() : "";

  const voxWhere = {
    deletedAt: null,
    mediaType: "UPLOADED_VIDEO" as const,
    mediaUrl: { not: null },
    OR: [{ thumbnailUrl: null }, { thumbnailUrl: "/video-thumb.svg" }, { thumbnailUrl: "" }],
  };

  const commentWhere = {
    deletedAt: null,
    videoUrl: { not: null },
    videoPosterUrl: null,
    NOT: {
      videoUrl: { contains: "youtube.com/embed" },
    },
  };

  const voxRows = commentsOnly
    ? []
    : await prisma.vox.findMany({
        where: voxWhere,
        select: { id: true, mediaUrl: true, thumbnailUrl: true },
        orderBy: { createdAt: "asc" },
        take: limit,
      });

  const commentRows = voxOnly
    ? []
    : await prisma.comment.findMany({
        where: commentWhere,
        select: { id: true, videoUrl: true },
        orderBy: { createdAt: "asc" },
        take: limit,
      });

  const filteredComments = commentRows.filter((c) => {
    const v = c.videoUrl?.trim();
    return Boolean(v && !isYoutubeEmbedUrl(v));
  });

  console.log(
    execute
      ? "EXECUTE mode (writes the database and uploads images)."
      : "Dry run (writes nothing). Pass --execute.",
  );
  if (limit !== undefined) console.log(`Limit per kind: ${limit}`);
  console.log({ voxCandidates: voxRows.length, commentCandidates: filteredComments.length });

  if (!execute) {
    for (const v of voxRows) {
      console.log(`[vox] ${v.id} media=${v.mediaUrl} thumb=${v.thumbnailUrl ?? "null"}`);
    }
    for (const c of filteredComments) {
      console.log(`[comment] ${c.id} video=${c.videoUrl}`);
    }
    return;
  }

  let voxOk = 0;
  let voxErr = 0;
  let commentOk = 0;
  let commentErr = 0;

  for (const v of voxRows) {
    const mediaUrl = v.mediaUrl?.trim();
    if (!mediaUrl || !needsGenericVoxThumb(v.thumbnailUrl)) continue;
    try {
      const vidBuf = await readUploadBytes(mediaUrl, site);
      const png = await extractVideoPosterPngBuffer(vidBuf, extensionFromUrl(mediaUrl));
      const saved = await saveImageWithThumb(png, "png");
      await prisma.vox.update({
        where: { id: v.id },
        data: { thumbnailUrl: saved.thumbnailUrl },
      });
      voxOk += 1;
      console.log(`OK vox ${v.id} → ${saved.thumbnailUrl}`);
    } catch (e) {
      voxErr += 1;
      console.error(`ERROR vox ${v.id}:`, e);
    }
  }

  for (const c of filteredComments) {
    const videoUrl = c.videoUrl?.trim();
    if (!videoUrl) continue;
    try {
      const vidBuf = await readUploadBytes(videoUrl, site);
      const png = await extractVideoPosterPngBuffer(vidBuf, extensionFromUrl(videoUrl));
      const saved = await saveImageWithThumb(png, "png");
      await prisma.comment.update({
        where: { id: c.id },
        data: { videoPosterUrl: saved.thumbnailUrl },
      });
      commentOk += 1;
      console.log(`OK comment ${c.id} → ${saved.thumbnailUrl}`);
    } catch (e) {
      commentErr += 1;
      console.error(`ERROR comment ${c.id}:`, e);
    }
  }

  console.log("\nSummary:", { voxOk, voxErr, commentOk, commentErr });
};

void main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
