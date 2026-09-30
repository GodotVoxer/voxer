import path from "path";

import { r2PublicOrigin } from "@/lib/media/publicStorage";

const BUCKET_UPLOAD_PATH_RE = /^uploads\/\d{4}\/\d{2}\/[\w.-]+$/;

export const isR2PublicUploadUrl = (raw: string): boolean => {
  const origin = r2PublicOrigin();
  if (!origin) return false;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    if (u.origin !== origin) return false;
    const p = u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
    return BUCKET_UPLOAD_PATH_RE.test(p);
  } catch {
    return false;
  }
};

const LOCAL_UPLOAD_PATH_RE = /^\/uploads\/\d{4}\/\d{2}\/[\w.-]+$/;

export const isLocalPublicUploadPath = (raw: string): boolean => LOCAL_UPLOAD_PATH_RE.test(raw);

export const isManagedPublicUploadUrl = (raw: string | null | undefined): raw is string => {
  if (raw == null || typeof raw !== "string") return false;
  const t = raw.trim();
  if (!t) return false;
  const low = t.toLowerCase();
  if (t === "/video-thumb.svg") return false;
  if (low.includes("youtube.com") || low.includes("youtu.be")) return false;
  return isR2PublicUploadUrl(t) || isLocalPublicUploadPath(t);
};

const UPLOADS_FS_ROOT = path.join(process.cwd(), "public", "uploads");

export const absolutePathForLocalPublicUpload = (publicPath: string): string | null => {
  if (!isLocalPublicUploadPath(publicPath)) return null;
  const rel = publicPath.replace(/^\/uploads\//, "");
  if (!/^\d{4}\/\d{2}\/[\w.-]+$/.test(rel)) return null;
  const root = path.resolve(UPLOADS_FS_ROOT);
  const abs = path.resolve(path.join(UPLOADS_FS_ROOT, ...rel.split("/")));
  if (abs !== root && !abs.startsWith(`${root}${path.sep}`)) return null;
  return abs;
};

export type VoxEvictionMediaSnapshot = {
  mediaType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  comments: { imageUrl: string | null; videoUrl: string | null; videoPosterUrl: string | null }[];
};

export const collectManagedUploadUrlsFromVoxSnapshot = (v: VoxEvictionMediaSnapshot): string[] => {
  const out = new Set<string>();
  const add = (u: string | null | undefined) => {
    if (isManagedPublicUploadUrl(u)) out.add(u);
  };
  if (v.mediaType !== "YOUTUBE") {
    add(v.mediaUrl);
    add(v.thumbnailUrl);
  }
  for (const c of v.comments) {
    add(c.imageUrl);
    add(c.videoUrl);
    add(c.videoPosterUrl);
  }
  return [...out];
};

export type CommentMediaSnapshot = {
  imageUrl: string | null;
  videoUrl: string | null;
  videoPosterUrl: string | null;
};

export const collectManagedUploadUrlsFromCommentSnapshot = (c: CommentMediaSnapshot): string[] => {
  const out = new Set<string>();
  const add = (u: string | null | undefined) => {
    if (isManagedPublicUploadUrl(u)) out.add(u);
  };
  add(c.imageUrl);
  add(c.videoUrl);
  add(c.videoPosterUrl);
  return [...out];
};
