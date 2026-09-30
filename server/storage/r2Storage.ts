import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { effectiveR2S3Endpoint } from "@/server/storage/r2Env";
import { r2PublicUrlForKey } from "@/lib/media/publicStorage";

let cachedClient: S3Client | undefined;

const r2Bucket = (): string => process.env.R2_BUCKET!.trim();

export const getR2S3Client = (): S3Client => {
  if (cachedClient) return cachedClient;
  const endpoint = effectiveR2S3Endpoint()!.replace(/\/+$/, "");
  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return cachedClient;
};

export const presignedPutUploadsObject = async (opts: {
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<string> => {
  const cmd = new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: opts.key,
    ContentType: opts.contentType,
    ContentLength: opts.contentLength,
  });
  return getSignedUrl(getR2S3Client(), cmd, { expiresIn: 900 });
};

/** Only for keys that are never rewritten: CDNs and browsers will not ask again. */
export const R2_IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export const putR2ObjectBuffer = async (opts: {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<void> => {
  await getR2S3Client().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType,
      ...(opts.cacheControl ? { CacheControl: opts.cacheControl } : {}),
    }),
  );
};

export type R2ObjectReadResult =
  | { ok: true; body: Buffer; contentType: string }
  | { ok: false; reason: "missing" | "too_large" };

/** Reads through the S3 API, never the public URL: the CDN would cache the original bytes. */
export const readR2ObjectBuffer = async (
  key: string,
  maxBytes: number,
): Promise<R2ObjectReadResult> => {
  let out;
  try {
    out = await getR2S3Client().send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key }));
  } catch (e) {
    if (e instanceof NoSuchKey) return { ok: false, reason: "missing" };
    throw e;
  }
  if (!out.Body) return { ok: false, reason: "missing" };
  if (typeof out.ContentLength === "number" && out.ContentLength > maxBytes) {
    const body = out.Body as { destroy?: () => void };
    body.destroy?.();
    return { ok: false, reason: "too_large" };
  }
  const body = Buffer.from(await out.Body.transformToByteArray());
  if (body.byteLength > maxBytes) return { ok: false, reason: "too_large" };
  return { ok: true, body, contentType: out.ContentType ?? "" };
};

export const deleteR2ObjectByKey = async (key: string): Promise<void> => {
  await getR2S3Client().send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: key }));
};

export const iterateR2UploadsUnderPrefix = async function* (
  prefix: string,
): AsyncGenerator<{ key: string; publicUrl: string }> {
  let token: string | undefined;
  do {
    const out = await getR2S3Client().send(
      new ListObjectsV2Command({
        Bucket: r2Bucket(),
        Prefix: prefix,
        ...(token ? { ContinuationToken: token } : {}),
      }),
    );
    for (const obj of out.Contents ?? []) {
      if (obj.Key) {
        yield { key: obj.Key, publicUrl: r2PublicUrlForKey(obj.Key) };
      }
    }
    token = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (token);
};
