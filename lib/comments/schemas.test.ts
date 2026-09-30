import { describe, expect, it } from "vitest";
import { COMMENT_BODY_MAX, COMMENT_LIST_PAGE_MAX } from "@/lib/limits";
import { commentsQuerySchema, createCommentSchema } from "./schemas";

describe("createCommentSchema", () => {
  it("accepts text alone", () => {
    const r = createCommentSchema.safeParse({ body: "Hola", displayName: "Pepe" });
    expect(r.success).toBe(true);
  });
  it("accepts a comment without displayName", () => {
    const r = createCommentSchema.safeParse({ body: "Solo cuerpo" });
    expect(r.success).toBe(true);
  });
  it("accepts only a linked image without text", () => {
    const r = createCommentSchema.safeParse({
      body: "",
      imageUrl: "https://example.com/x.png",
    });
    expect(r.success).toBe(true);
  });
  it("accepts only YouTube without text", () => {
    const r = createCommentSchema.safeParse({
      body: "",
      youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
    });
    expect(r.success).toBe(true);
  });
  it("rejects an empty comment without attachment", () => {
    const r = createCommentSchema.safeParse({ body: "" });
    expect(r.success).toBe(false);
  });
  it("accepts only a poll vote, without text or attachment", () => {
    const r = createCommentSchema.safeParse({ body: "", pollDisclosureOptionId: "opt_1" });
    expect(r.success).toBe(true);
  });
  it("rejects an empty comment when the vote is blank", () => {
    const r = createCommentSchema.safeParse({ body: "   ", pollDisclosureOptionId: null });
    expect(r.success).toBe(false);
  });
  it("rejects image and video together", () => {
    const r = createCommentSchema.safeParse({
      body: "x",
      displayName: "y",
      imageUrl: "/i",
      videoUrl: "/v",
    });
    expect(r.success).toBe(false);
  });
  it("rejects image and youtubeUrl together", () => {
    const r = createCommentSchema.safeParse({
      body: "x",
      imageUrl: "https://a.com/z.jpg",
      youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
    });
    expect(r.success).toBe(false);
  });
  it("rejects a body over the maximum", () => {
    const r = createCommentSchema.safeParse({
      body: "x".repeat(COMMENT_BODY_MAX + 1),
    });
    expect(r.success).toBe(false);
  });
  it("accepts the optional showStaffIdentity", () => {
    const r = createCommentSchema.safeParse({ body: "Hola", showStaffIdentity: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.showStaffIdentity).toBe(true);
  });
  it("rejects a video poster without a video", () => {
    const r = createCommentSchema.safeParse({
      body: "x",
      videoPosterUrl: "https://example.com/p.webp",
    });
    expect(r.success).toBe(false);
  });
  it("rejects a video poster with YouTube", () => {
    const r = createCommentSchema.safeParse({
      body: "",
      youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
      videoPosterUrl: "https://example.com/p.webp",
    });
    expect(r.success).toBe(false);
  });
  it("accepts an uploaded video with a poster", () => {
    const r = createCommentSchema.safeParse({
      body: "m",
      videoUrl: "/uploads/2026/05/v.mp4",
      videoPosterUrl: "/uploads/2026/05/p.thumb.webp",
    });
    expect(r.success).toBe(true);
  });
});
describe("commentsQuerySchema", () => {
  it("coerces limit from a string", () => {
    const r = commentsQuerySchema.parse({ limit: "50" });
    expect(r.limit).toBe(50);
  });
  it("rejects a limit above the page cap", () => {
    const r = commentsQuerySchema.safeParse({ limit: COMMENT_LIST_PAGE_MAX + 1 });
    expect(r.success).toBe(false);
  });
  it("accepts afterCreatedAt and afterId together", () => {
    const r = commentsQuerySchema.safeParse({
      afterCreatedAt: "2026-01-01T00:00:00.000Z",
      afterId: "c1",
    });
    expect(r.success).toBe(true);
  });
  it("rejects an incomplete after, an invalid date or after combined with a cursor", () => {
    expect(
      commentsQuerySchema.safeParse({ afterCreatedAt: "2026-01-01T00:00:00.000Z" }).success,
    ).toBe(false);
    expect(commentsQuerySchema.safeParse({ afterCreatedAt: "ayer", afterId: "c1" }).success).toBe(
      false,
    );
    expect(
      commentsQuerySchema.safeParse({
        afterCreatedAt: "2026-01-01T00:00:00.000Z",
        afterId: "c1",
        cursor: "x",
      }).success,
    ).toBe(false);
  });
});
