import { describe, expect, it, vi } from "vitest";
import {
  assertCommentCreateClientIpCooldown,
  assertVoxCreateClientIpCooldown,
} from "./clientIpCreateCooldown";
import { PostingRateLimitError } from "./postingRateLimitError";

describe("assertVoxCreateClientIpCooldown", () => {
  it("does nothing without earlier vox from that fingerprint", async () => {
    const tx = {
      vox: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    await assertVoxCreateClientIpCooldown(tx as never, {
      clientIpHash: "abc",
      now: new Date(),
    });
    expect(tx.vox.findFirst).toHaveBeenCalled();
  });

  it("throws when the last vox from that fingerprint is inside the interval", async () => {
    const now = new Date("2026-05-14T12:00:00.000Z");
    const tx = {
      vox: {
        findFirst: vi.fn().mockResolvedValue({
          createdAt: new Date(now.getTime() - 60_000),
        }),
      },
    };
    try {
      await assertVoxCreateClientIpCooldown(tx as never, {
        clientIpHash: "abc",
        now,
      });
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PostingRateLimitError);
      expect((e as PostingRateLimitError).kind).toBe("vox_ip");
      expect((e as PostingRateLimitError).remainingMs).toBe(4 * 60_000);
    }
  });
});

describe("assertCommentCreateClientIpCooldown", () => {
  it("throws when the last comment from that fingerprint is inside the interval", async () => {
    const now = new Date("2026-05-14T12:00:00.000Z");
    const tx = {
      comment: {
        findFirst: vi.fn().mockResolvedValue({
          createdAt: new Date(now.getTime() - 1000),
        }),
      },
    };
    try {
      await assertCommentCreateClientIpCooldown(tx as never, {
        clientIpHash: "abc",
        now,
      });
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PostingRateLimitError);
      expect((e as PostingRateLimitError).kind).toBe("comment_ip");
      expect((e as PostingRateLimitError).remainingMs).toBe(4000);
    }
  });
});
