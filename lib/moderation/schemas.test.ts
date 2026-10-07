import { describe, expect, it } from "vitest";
import { REPORT_DETAILS_MAX, USERNAME_MAX } from "@/lib/limits";
import {
  createReportSchema,
  moderationAuthorPublicationsQuerySchema,
  moderationBanContentSchema,
  moderationStaffAddByUsernameSchema,
} from "./schemas";

describe("moderationStaffAddByUsernameSchema", () => {
  it("accepts a username", () => {
    const r = moderationStaffAddByUsernameSchema.safeParse({ username: "nuevo_mod" });
    expect(r.success).toBe(true);
  });
  it("rejects empty", () => {
    expect(moderationStaffAddByUsernameSchema.safeParse({ username: "" }).success).toBe(false);
  });
  it("rejects over the maximum", () => {
    expect(
      moderationStaffAddByUsernameSchema.safeParse({ username: "x".repeat(USERNAME_MAX + 1) })
        .success,
    ).toBe(false);
  });
});
describe("moderationAuthorPublicationsQuerySchema", () => {
  it("accepts only voxId", () => {
    const r = moderationAuthorPublicationsQuerySchema.safeParse({ voxId: "abc" });
    expect(r.success).toBe(true);
  });
  it("accepts only commentId", () => {
    const r = moderationAuthorPublicationsQuerySchema.safeParse({ commentId: "def" });
    expect(r.success).toBe(true);
  });
  it("rejects both or neither", () => {
    expect(
      moderationAuthorPublicationsQuerySchema.safeParse({ voxId: "a", commentId: "b" }).success,
    ).toBe(false);
    expect(moderationAuthorPublicationsQuerySchema.safeParse({}).success).toBe(false);
  });
});

describe("moderationBanContentSchema", () => {
  it("accepts forever", () => {
    const r = moderationBanContentSchema.safeParse({ targetUserId: "u1", forever: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.forever).toBe(true);
  });
  it("keeps the files unless told otherwise", () => {
    const r = moderationBanContentSchema.safeParse({ targetUserId: "u1", forever: true });
    expect(r.success && r.data.media).toBe("keep");
  });
  it("accepts purging or blocking the files and rejects anything else", () => {
    for (const media of ["purge", "block"]) {
      const r = moderationBanContentSchema.safeParse({ targetUserId: "u1", forever: true, media });
      expect(r.success && r.data.media).toBe(media);
    }
    expect(
      moderationBanContentSchema.safeParse({ targetUserId: "u1", forever: true, media: "nuke" })
        .success,
    ).toBe(false);
  });
  it("accepts a relative window", () => {
    const r = moderationBanContentSchema.safeParse({
      targetUserId: "u1",
      forever: false,
      amount: 2,
      unit: "HOURS",
    });
    expect(r.success).toBe(true);
    if (r.success && "amount" in r.data) {
      expect(r.data.amount).toBe(2);
      expect(r.data.unit).toBe("HOURS");
    }
  });
  it("rejects an amount over the cap", () => {
    const r = moderationBanContentSchema.safeParse({
      targetUserId: "u1",
      forever: false,
      amount: 999_999,
      unit: "DAYS",
    });
    expect(r.success).toBe(false);
  });
});

describe("createReportSchema", () => {
  it("accepts a valid report without details", () => {
    const r = createReportSchema.safeParse({
      voxId: "v1",
      reason: "SPAM",
    });
    expect(r.success).toBe(true);
  });

  it("accepts details within the limit", () => {
    const r = createReportSchema.safeParse({
      voxId: "v1",
      commentId: "c1",
      reason: "OTHER",
      details: "Aclaración breve dentro del límite permitido.",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.details).toBe("Aclaración breve dentro del límite permitido.");
    }
  });

  it("rejects details over REPORT_DETAILS_MAX", () => {
    const r = createReportSchema.safeParse({
      voxId: "v1",
      reason: "GORE",
      details: "x".repeat(REPORT_DETAILS_MAX + 1),
    });
    expect(r.success).toBe(false);
  });
});
