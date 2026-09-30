import { beforeEach, describe, expect, it } from "vitest";
import { usePresenceStore } from "./store";

describe("usePresenceStore", () => {
  beforeEach(() => {
    usePresenceStore.setState({ onlineCount: null });
  });

  it("starts with onlineCount null", () => {
    expect(usePresenceStore.getState().onlineCount).toBeNull();
  });

  it("updates onlineCount", () => {
    usePresenceStore.getState().setOnlineCount(42);
    expect(usePresenceStore.getState().onlineCount).toBe(42);

    usePresenceStore.getState().setOnlineCount(1);
    expect(usePresenceStore.getState().onlineCount).toBe(1);

    usePresenceStore.getState().setOnlineCount(null);
    expect(usePresenceStore.getState().onlineCount).toBeNull();
  });
});
