import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { isR2StorageFullyConfigured } from "@/server/storage/r2Env";
import { r2PublicUrlForKey } from "@/lib/media/publicStorage";
import { deleteR2ObjectByKey, getR2S3Client } from "@/server/storage/r2Storage";
import { THEME_BG_KEY_PREFIX, THEME_BG_OBJECT_KEY_RE } from "@/lib/theme/themeAssetUrls";

const LOCAL_UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

/** Random key without a user id: a public URL must not link an image to an account. */
export const newThemeAssetKeys = (): { key: string; keySm: string } => {
  const id = randomUUID();
  return { key: `${THEME_BG_KEY_PREFIX}${id}.webp`, keySm: `${THEME_BG_KEY_PREFIX}${id}-sm.webp` };
};

const assertKey = (key: string) => {
  if (!THEME_BG_OBJECT_KEY_RE.test(key)) throw new Error("Invalid theme image key");
};

const localPathFor = (key: string): string => {
  assertKey(key);
  return path.join(LOCAL_UPLOADS_ROOT, ...key.split("/"));
};

export const themeAssetPublicUrl = (key: string): string =>
  isR2StorageFullyConfigured() ? r2PublicUrlForKey(key) : `/uploads/${key}`;

export const putThemeAssetObject = async (key: string, body: Buffer): Promise<void> => {
  assertKey(key);
  if (isR2StorageFullyConfigured()) {
    await getR2S3Client().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!.trim(),
        Key: key,
        Body: body,
        ContentType: "image/webp",
        // Every upload gets a new key, so a key's content never changes.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return;
  }
  const file = localPathFor(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
};

export const readThemeAssetObject = async (key: string): Promise<Buffer> => {
  assertKey(key);
  if (!isR2StorageFullyConfigured()) return readFile(localPathFor(key));
  const response = await getR2S3Client().send(
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET!.trim(), Key: key }),
  );
  if (!response.Body) throw new Error("Empty theme object");
  return Buffer.from(await response.Body.transformToByteArray());
};

export const deleteThemeAssetObject = async (key: string): Promise<void> => {
  try {
    if (isR2StorageFullyConfigured()) {
      assertKey(key);
      await deleteR2ObjectByKey(key);
    } else {
      await unlink(localPathFor(key));
    }
  } catch {
    /* best-effort: an orphan object breaks nothing and must not fail the user's operation */
  }
};
