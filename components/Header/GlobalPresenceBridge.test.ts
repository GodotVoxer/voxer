import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GlobalPresenceBridge, MOCK_DEMO_ONLINE_COUNT } from "./GlobalPresenceBridge";

const mocks = vi.hoisted(() => ({
  acquireRealtimeRoom: vi.fn(),
  setOnlineCount: vi.fn(),
  isMockDemoMode: vi.fn(),
  realtimePushEnabled: vi.fn(),
  getPresenceClientId: vi.fn(() => "mock-client-id"),
}));

let effectCallback: (() => (() => void) | void) | undefined;

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: (cb: () => (() => void) | void) => {
    effectCallback = cb;
  },
}));

vi.mock("@/features/presence/store", () => ({
  usePresenceStore: (selector: (s: { setOnlineCount: typeof mocks.setOnlineCount }) => unknown) =>
    selector({ setOnlineCount: mocks.setOnlineCount }),
}));

vi.mock("@/mocks/initMocks", () => ({
  isMockDemoMode: () => mocks.isMockDemoMode(),
}));

vi.mock("@/lib/realtime/mode", () => ({
  realtimePushEnabled: () => mocks.realtimePushEnabled(),
}));

vi.mock("@/features/realtime/acquire", () => ({
  acquireRealtimeRoom: (...args: unknown[]) => mocks.acquireRealtimeRoom(...args),
}));

vi.mock("@/features/realtime/presenceClientId", () => ({
  getPresenceClientId: () => mocks.getPresenceClientId(),
}));

describe("GlobalPresenceBridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    effectCallback = undefined;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the demo count in MSW demo mode", () => {
    mocks.isMockDemoMode.mockReturnValue(true);

    GlobalPresenceBridge();
    effectCallback?.();

    expect(mocks.setOnlineCount).toHaveBeenCalledWith(MOCK_DEMO_ONLINE_COUNT);
    expect(mocks.acquireRealtimeRoom).not.toHaveBeenCalled();
  });

  it("connects to the presence room when push is on outside the demo", async () => {
    mocks.isMockDemoMode.mockReturnValue(false);
    mocks.realtimePushEnabled.mockReturnValue(true);

    const onHandlers: Record<string, (data: unknown) => void> = {};
    const mockLease = {
      on: vi.fn((event: string, handler: (data: unknown) => void) => {
        onHandlers[event] = handler;
      }),
      off: vi.fn(),
      release: vi.fn(),
    };
    mocks.acquireRealtimeRoom.mockResolvedValue(mockLease);

    GlobalPresenceBridge();
    const cleanup = effectCallback?.();

    await Promise.resolve(); // Permite que resuelva la promesa de acquireRealtimeRoom

    expect(mocks.acquireRealtimeRoom).toHaveBeenCalledWith({
      room: "presence:global",
      clientId: "mock-client-id",
    });
    expect(mockLease.on).toHaveBeenCalledWith("presence:update", expect.any(Function));

    onHandlers["presence:update"]?.({ count: 88 });
    expect(mocks.setOnlineCount).toHaveBeenCalledWith(88);

    cleanup?.();
    expect(mockLease.release).toHaveBeenCalled();
  });
});
