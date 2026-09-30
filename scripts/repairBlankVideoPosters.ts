/**
 * Repairs fully transparent video posters left by an old client-side capture that drew the canvas
 * before the frame was presented. Posters are generated server-side with ffmpeg now.
 *
 * Reads every poster to decide, so the dry run needs network access too. Needs `DATABASE_URL`, ffmpeg,
 * the production storage (R2) for writing, and `SITE_URL` or `NEXT_PUBLIC_APP_URL` to read `/uploads/...`.
 *
 *   npm run db:repair-blank-video-posters [-- --execute [--limit N] [--comments-only | --vox-only]]
 */
import "./loadScriptEnv";
import { readFile } from "fs/promises";
import { prisma } from "@/server/db/prisma";
import { extractVideoPosterPngBuffer } from "@/server/media/extractVideoPosterFrame";
import { saveImageWithThumb } from "@/server/media/imageProcess";
import { posterImageBufferIsBlank } from "@/server/media/blankPosterImage";
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

const siteBase = (): string =>
  (process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "").replace(
    /\/+$/,
    "",
  );

const toAbsoluteUrl = (raw: string, site: string): string => {
  const t = raw.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("/")) {
    if (!site) {
      throw new Error(`Set SITE_URL or NEXT_PUBLIC_APP_URL to resolve ${t}`);
    }
    return `${site}${t}`;
  }
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
    if (!disk) throw new Error(`Invalid local path: ${url}`);
    return readFile(disk);
  }
  const abs = toAbsoluteUrl(url, site);
  const res = await fetch(abs, { redirect: "follow" });
  if (!res.ok) throw new Error(`GET ${abs} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};

const usablePosterUrl = (t: string | null): string | null => {
  const v = t?.trim();
  if (!v || v === "/video-thumb.svg") return null;
  return v;
};

type Candidate = { kind: "vox" | "comment"; id: string; videoUrl: string; posterUrl: string };

const main = async () => {
  const execute = readFlag("execute");
  const commentsOnly = readFlag("comments-only");
  const voxOnly = readFlag("vox-only");
  const limit = readNumericFlag("limit");
  const site = siteBase();

  const voxRows = commentsOnly
    ? []
    : await prisma.vox.findMany({
        where: {
          deletedAt: null,
          mediaType: "UPLOADED_VIDEO",
          mediaUrl: { not: null },
          thumbnailUrl: { not: null },
        },
        select: { id: true, mediaUrl: true, thumbnailUrl: true },
        orderBy: { createdAt: "asc" },
      });

  const commentRows = voxOnly
    ? []
    : await prisma.comment.findMany({
        where: {
          deletedAt: null,
          videoUrl: { not: null },
          videoPosterUrl: { not: null },
          NOT: { videoUrl: { contains: "youtube.com/embed" } },
        },
        select: { id: true, videoUrl: true, videoPosterUrl: true },
        orderBy: { createdAt: "asc" },
      });

  const scanned: Candidate[] = [
    ...voxRows.flatMap((v) => {
      const videoUrl = v.mediaUrl?.trim();
      const posterUrl = usablePosterUrl(v.thumbnailUrl);
      return videoUrl && posterUrl ? [{ kind: "vox" as const, id: v.id, videoUrl, posterUrl }] : [];
    }),
    ...commentRows.flatMap((c) => {
      const videoUrl = c.videoUrl?.trim();
      const posterUrl = usablePosterUrl(c.videoPosterUrl);
      return videoUrl && posterUrl && !isYoutubeEmbedUrl(videoUrl)
        ? [{ kind: "comment" as const, id: c.id, videoUrl, posterUrl }]
        : [];
    }),
  ];

  console.log(
    execute
      ? "EXECUTE mode (writes the database and uploads images)."
      : "Dry run (writes nothing). Pass --execute.",
  );
  console.log(`Posters to check: ${scanned.length}`);

  // One blank poster may be deduplicated across rows: download it once.
  const blankByUrl = new Map<string, boolean>();
  const blank: Candidate[] = [];
  for (const row of scanned) {
    let isBlank = blankByUrl.get(row.posterUrl);
    if (isBlank === undefined) {
      try {
        isBlank = await posterImageBufferIsBlank(await readUploadBytes(row.posterUrl, site));
      } catch (e) {
        console.error(`ERROR reading poster of ${row.kind} ${row.id}:`, e);
        isBlank = false;
      }
      blankByUrl.set(row.posterUrl, isBlank);
    }
    if (isBlank) blank.push(row);
    if (limit !== undefined && blank.length >= limit) break;
  }

  console.log(`Blank posters: ${blank.length}`);
  for (const row of blank) console.log(`[${row.kind}] ${row.id} poster=${row.posterUrl}`);
  if (!execute || blank.length === 0) return;

  let ok = 0;
  let err = 0;
  for (const row of blank) {
    try {
      const vidBuf = await readUploadBytes(row.videoUrl, site);
      const png = await extractVideoPosterPngBuffer(vidBuf, extensionFromUrl(row.videoUrl));
      const saved = await saveImageWithThumb(png, "png");
      if (row.kind === "vox") {
        await prisma.vox.update({
          where: { id: row.id },
          data: { thumbnailUrl: saved.thumbnailUrl },
        });
      } else {
        await prisma.comment.update({
          where: { id: row.id },
          data: { videoPosterUrl: saved.thumbnailUrl },
        });
      }
      ok += 1;
      console.log(`OK ${row.kind} ${row.id} → ${saved.thumbnailUrl}`);
    } catch (e) {
      err += 1;
      console.error(`ERROR ${row.kind} ${row.id}:`, e);
    }
  }

  // Blank posters are left unreferenced; the `StoredMediaByHash` sweep removes them.
  console.log("\nSummary:", { ok, err });
};

void main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
