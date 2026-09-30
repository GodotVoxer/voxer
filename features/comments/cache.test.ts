import { afterEach, describe, expect, it } from "vitest";
import { cacheComments, clearCommentCache, readCachedComments } from "@/features/comments/cache";
import type { CommentPublic } from "@/lib/vox/types";

const comment = { id: "c1" } as CommentPublic;

afterEach(clearCommentCache);

describe("commentCache", () => {
  it("reuses recent comments", () => {
    cacheComments("v1", [comment], 1_000);
    expect(readCachedComments("v1", 2_000)).toEqual([comment]);
  });

  it("drops expired entries", () => {
    cacheComments("v1", [comment], 1_000);
    expect(readCachedComments("v1", 200_000)).toBeNull();
  });

  it("caps the number of cached vox", () => {
    for (let index = 0; index < 11; index += 1) {
      cacheComments(`v${index}`, [comment], index);
    }
    expect(readCachedComments("v0", 11)).toBeNull();
    expect(readCachedComments("v10", 11)).toEqual([comment]);
  });
});
