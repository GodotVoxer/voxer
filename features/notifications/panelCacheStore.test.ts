import { describe, it, expect, beforeEach } from "vitest";
import { useNotificationPanelCacheStore, clearNotificationPanelCaches } from "./panelCacheStore";

beforeEach(() => {
  clearNotificationPanelCaches();
});

describe("useNotificationPanelCacheStore", () => {
  it("stores user list by owner", () => {
    useNotificationPanelCacheStore.getState().setUserPanel("u1", [
      {
        id: "n1",
        message: "m",
        thumbnailUrl: null,
        voxId: "v1",
        commentPublicTag: null,
        readAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(useNotificationPanelCacheStore.getState().userByOwner).toEqual({
      ownerId: "u1",
      items: [
        {
          id: "n1",
          message: "m",
          thumbnailUrl: null,
          voxId: "v1",
          commentPublicTag: null,
          readAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
  });

  it("clear drops both panels", () => {
    useNotificationPanelCacheStore.getState().setUserPanel("u1", []);
    useNotificationPanelCacheStore.getState().setStaffPanel("u1", []);
    clearNotificationPanelCaches();
    expect(useNotificationPanelCacheStore.getState().userByOwner).toBeNull();
    expect(useNotificationPanelCacheStore.getState().staffByOwner).toBeNull();
  });
});
