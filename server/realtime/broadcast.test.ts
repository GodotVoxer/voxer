import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  broadcastVoxActivity,
  broadcastVoxBulkDeleted,
  broadcastVoxCreated,
  broadcastVoxDeleted,
  broadcastUserThemeUpdated,
} from "@/server/realtime/broadcast";
import { FEED_HOME_ROOM } from "@/lib/realtime/rooms";

describe("broadcast feed home", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    process.env.REALTIME_BROADCAST_ENABLED = "true";
    process.env.SOCKET_BROADCAST_SECRET = "test-secret";
    process.env.SOCKET_SERVER_URL = "http://127.0.0.1:3001";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.REALTIME_BROADCAST_ENABLED;
    delete process.env.SOCKET_BROADCAST_SECRET;
    delete process.env.SOCKET_SERVER_URL;
  });

  const bodies = () =>
    fetchMock.mock.calls.map(
      (c) =>
        JSON.parse((c[1] as RequestInit).body as string) as {
          room: string;
          event: string;
          data: unknown;
        },
    );

  it("does not contact the socket service when broadcasts are disabled", async () => {
    process.env.REALTIME_BROADCAST_ENABLED = "false";
    await broadcastVoxActivity("v1", 3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("broadcastVoxDeleted emits to the vox and feed:home", async () => {
    await broadcastVoxDeleted("v1", "moderation");
    const emitted = bodies();
    expect(emitted).toHaveLength(2);
    expect(emitted[0]).toEqual({
      room: "vox:v1",
      event: "vox:deleted",
      data: { voxId: "v1", reason: "moderation" },
    });
    expect(emitted[1]).toEqual({
      room: FEED_HOME_ROOM,
      event: "vox:deleted",
      data: { voxId: "v1", reason: "moderation" },
    });
  });

  it("broadcastVoxBulkDeleted emits bulk to the feed and deleted per vox", async () => {
    await broadcastVoxBulkDeleted(["a", "b"], "moderation");
    const emitted = bodies();
    expect(emitted).toHaveLength(3);
    expect(emitted.find((e) => e.event === "vox:bulk-deleted")).toEqual({
      room: FEED_HOME_ROOM,
      event: "vox:bulk-deleted",
      data: { voxIds: ["a", "b"], reason: "moderation" },
    });
  });

  it("broadcastVoxActivity goes only to feed:home", async () => {
    await broadcastVoxActivity("v1", 3);
    expect(bodies()).toEqual([
      {
        room: FEED_HOME_ROOM,
        event: "vox:activity",
        data: { voxId: "v1", replies: 3 },
      },
    ]);
  });

  it("broadcastVoxCreated goes only to feed:home", async () => {
    const item = {
      id: "n1",
      title: "T",
      category: "General",
      thumbnailUrl: null,
      coverGifUrl: null,
      mediaType: "IMAGE",
      replies: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      favorited: false,
      hasPoll: false,
      pinnedAt: null,
      animatedImage: false,
    };
    await broadcastVoxCreated(item);
    expect(bodies()[0]).toEqual({
      room: FEED_HOME_ROOM,
      event: "vox:created",
      data: item,
    });
  });

  it("broadcastUserThemeUpdated notifies only the user's room, without theme data", async () => {
    await broadcastUserThemeUpdated("clxuser1234");
    expect(bodies()).toEqual([{ room: "user:clxuser1234", event: "user:theme-updated", data: {} }]);
  });
});
