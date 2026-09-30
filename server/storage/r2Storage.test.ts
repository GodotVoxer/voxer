import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  R2_IMMUTABLE_CACHE_CONTROL,
  putR2ObjectBuffer,
  readR2ObjectBuffer,
} from "@/server/storage/r2Storage";
import { r2KeyForPublicUrl } from "@/lib/media/publicStorage";

const bodyOf = (bytes: number[]) => ({
  transformToByteArray: async () => new Uint8Array(bytes),
  destroy: vi.fn(),
});

describe("r2Storage", () => {
  let send: MockInstance<(command: unknown) => Promise<unknown>>;

  beforeEach(() => {
    vi.stubEnv("R2_S3_ENDPOINT", "https://account.r2.example");
    vi.stubEnv("R2_BUCKET", "bucket");
    vi.stubEnv("R2_ACCESS_KEY_ID", "id");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "https://storage.example/");
    send = vi.spyOn(S3Client.prototype, "send") as unknown as MockInstance<
      (command: unknown) => Promise<unknown>
    >;
  });

  afterEach(() => {
    send.mockRestore();
    vi.unstubAllEnvs();
  });

  it("readR2ObjectBuffer reads through the S3 API, not the public URL", async () => {
    send.mockResolvedValue({ Body: bodyOf([1, 2, 3]), ContentLength: 3, ContentType: "video/mp4" });
    const r = await readR2ObjectBuffer("uploads/2026/09/a.mp4", 10);
    expect(r).toEqual({ ok: true, body: Buffer.from([1, 2, 3]), contentType: "video/mp4" });
    const cmd = send.mock.calls[0]?.[0];
    expect(cmd).toBeInstanceOf(GetObjectCommand);
    expect((cmd as GetObjectCommand).input).toEqual({
      Bucket: "bucket",
      Key: "uploads/2026/09/a.mp4",
    });
  });

  it("readR2ObjectBuffer stops before reading when ContentLength exceeds the max", async () => {
    const body = bodyOf([1, 2, 3]);
    send.mockResolvedValue({ Body: body, ContentLength: 3 });
    await expect(readR2ObjectBuffer("k", 2)).resolves.toEqual({ ok: false, reason: "too_large" });
    expect(body.destroy).toHaveBeenCalled();
  });

  it("readR2ObjectBuffer checks the read size even without ContentLength", async () => {
    send.mockResolvedValue({ Body: bodyOf([1, 2, 3]) });
    await expect(readR2ObjectBuffer("k", 2)).resolves.toEqual({ ok: false, reason: "too_large" });
  });

  it("readR2ObjectBuffer reports a missing object without throwing", async () => {
    send.mockRejectedValue(new NoSuchKey({ message: "nope", $metadata: {} }));
    await expect(readR2ObjectBuffer("k", 2)).resolves.toEqual({ ok: false, reason: "missing" });
  });

  it("putR2ObjectBuffer sends Cache-Control only when asked", async () => {
    send.mockResolvedValue({});
    await putR2ObjectBuffer({ key: "a", body: Buffer.from([1]), contentType: "image/webp" });
    await putR2ObjectBuffer({
      key: "b",
      body: Buffer.from([1]),
      contentType: "image/webp",
      cacheControl: R2_IMMUTABLE_CACHE_CONTROL,
    });
    const [first, second] = send.mock.calls.map((c) => (c[0] as PutObjectCommand).input);
    expect(first).not.toHaveProperty("CacheControl");
    expect(second?.CacheControl).toBe(R2_IMMUTABLE_CACHE_CONTROL);
  });

  it("r2KeyForPublicUrl inverts the public URL and rejects other origins", () => {
    expect(r2KeyForPublicUrl("https://storage.example/uploads/2026/09/a.mp4")).toBe(
      "uploads/2026/09/a.mp4",
    );
    expect(r2KeyForPublicUrl("https://evil.example/uploads/a.mp4")).toBeNull();
    expect(r2KeyForPublicUrl("https://storage.example.evil/uploads/a.mp4")).toBeNull();
    expect(r2KeyForPublicUrl("https://storage.example/uploads/a.mp4?x=1")).toBeNull();
    expect(r2KeyForPublicUrl("/video-thumb.svg")).toBeNull();
  });
});
