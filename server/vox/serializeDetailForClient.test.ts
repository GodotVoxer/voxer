import { describe, expect, it } from "vitest";
import type { VoxDetailApi } from "@/server/vox/getDetailApi";
import { serializeVoxDetailForClient } from "./serializeDetailForClient";

describe("serializeVoxDetailForClient", () => {
  it("produces a JSON-safe object with dates as strings", () => {
    const row = {
      id: "v1",
      title: "t",
      description: "d",
      author: "a",
      category: "General",
      mediaType: "IMAGE" as const,
      mediaUrl: "/x",
      thumbnailUrl: "/y",
      youtubeVideoId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      lastActivityAt: new Date("2026-01-01T00:00:00.000Z"),
      ownerId: null,
      deletedAt: null,
      deletedByUserId: null,
      threadUniqueIdsEnabled: false,
      countryFlagsEnabled: false,
      hasPoll: false,
      following: false,
      hidden: false,
      favorited: false,
      isOwner: false,
    } as unknown as VoxDetailApi;

    const serialized = serializeVoxDetailForClient(row);
    expect(typeof serialized.createdAt).toBe("string");
    expect(serialized.id).toBe("v1");
    expect(serialized.hasPoll).toBe(false);
    expect(serialized.poll).toBe(null);
    expect("author" in serialized).toBe(false);
    expect("ownerId" in serialized).toBe(false);
  });
});
