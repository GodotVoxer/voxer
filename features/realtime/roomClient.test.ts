import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

class FakeWebSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static instances: FakeWebSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  constructor(readonly url: string) {
    super();
    FakeWebSocket.instances.push(this);
  }
  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatchEvent(new Event("open"));
  }
  send(data: string) {
    this.sent.push(data);
  }
  /** Half-open connection: never answers and `close()` never fires the event. */
  close() {
    this.readyState = 2;
  }
  receive(data: string) {
    this.dispatchEvent(new MessageEvent("message", { data }));
  }
}

const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
const win = new EventTarget() as EventTarget & { VoxerAndroid?: Record<string, () => unknown> };
const becomeVisible = () => {
  doc.visibilityState = "visible";
  doc.dispatchEvent(new Event("visibilitychange"));
};
const becomeHidden = () => {
  doc.visibilityState = "hidden";
  doc.dispatchEvent(new Event("visibilitychange"));
};
const androidBridge = Object.fromEntries(
  [
    "appInfo",
    "getPushToken",
    "requestPushToken",
    "notificationPermissionState",
    "openAppNotificationSettings",
    "setBadgeCount",
    "setThemeColors",
    "setGestureLock",
  ].map((name) => [name, () => null]),
);

let acquireRoom: typeof import("./roomClient").acquireRoom;

beforeAll(async () => {
  vi.stubGlobal("WebSocket", FakeWebSocket);
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  ({ acquireRoom } = await import("./roomClient"));
});

const flush = () => Promise.resolve().then(() => Promise.resolve());

describe("acquireRoom when returning from the background", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
  });
  afterEach(() => vi.useRealTimers());

  it("probes the connection with a ping and reconnects without a pong", async () => {
    const lease = acquireRoom({ baseUrl: "https://rt.example", room: "feed:home" });
    const onReconnect = vi.fn();
    lease.onReconnect(onReconnect);
    await flush();
    const first = FakeWebSocket.instances[0]!;
    first.open();
    expect(onReconnect).not.toHaveBeenCalled();

    becomeVisible();
    expect(first.sent).toContain("ping");

    await vi.advanceTimersByTimeAsync(5_000);
    await vi.advanceTimersByTimeAsync(1_000);
    const second = FakeWebSocket.instances[1];
    expect(second).toBeDefined();
    second!.open();
    expect(onReconnect).toHaveBeenCalledTimes(1);

    // A late `close` from the abandoned socket must not drop the new connection.
    first.dispatchEvent(new Event("close"));
    await vi.advanceTimersByTimeAsync(2_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(second!.readyState).toBe(FakeWebSocket.OPEN);
    lease.offReconnect(onReconnect);
    lease.release();
  });

  it("does not open a second socket when focus returns while the token is fetched", async () => {
    // The user room fetches a JWT on every attempt; without the in-flight flag each
    // `visibilitychange` during that fetch started another connection to the same room.
    let resolveToken: ((token: string) => void) | undefined;
    const getToken = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolveToken = resolve;
        }),
    );
    const lease = acquireRoom({
      baseUrl: "https://rt.example",
      room: "user:abcdefgh",
      getToken,
    });
    await flush();
    expect(getToken).toHaveBeenCalledTimes(1);

    becomeVisible();
    becomeVisible();
    await flush();
    expect(getToken).toHaveBeenCalledTimes(1);

    resolveToken?.("token");
    await flush();
    expect(FakeWebSocket.instances).toHaveLength(1);
    lease.release();
  });

  it("reconnects immediately when the socket is already closed on return", async () => {
    const lease = acquireRoom({ baseUrl: "https://rt.example", room: "feed:closed" });
    const onReconnect = vi.fn();
    lease.onReconnect(onReconnect);
    await flush();
    const first = FakeWebSocket.instances[0]!;
    first.open();
    first.close();

    becomeVisible();
    await flush();
    const second = FakeWebSocket.instances[1];
    expect(second).toBeDefined();
    second!.open();
    expect(onReconnect).toHaveBeenCalledTimes(1);
    lease.release();
  });

  it("does not reconnect when the connection answers", async () => {
    const lease = acquireRoom({ baseUrl: "https://rt.example", room: "vox:abcdefgh" });
    const onReconnect = vi.fn();
    lease.onReconnect(onReconnect);
    await flush();
    const socket = FakeWebSocket.instances[0]!;
    socket.open();

    becomeVisible();
    socket.receive("pong");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(socket.readyState).toBe(FakeWebSocket.OPEN);
    expect(onReconnect).not.toHaveBeenCalled();
    lease.release();
  });
});

describe("acquireRoom in the background", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
  });
  afterEach(() => {
    delete win.VoxerAndroid;
    vi.useRealTimers();
  });

  it("inside the Android app closes the socket when hidden and reconnects on return", async () => {
    win.VoxerAndroid = androidBridge;
    const lease = acquireRoom({ baseUrl: "https://rt.example", room: "presence:global" });
    const onReconnect = vi.fn();
    lease.onReconnect(onReconnect);
    await flush();
    const first = FakeWebSocket.instances[0]!;
    first.open();

    becomeHidden();
    expect(first.readyState).toBe(2);
    // Neither the backoff nor an `online` event reopens while still in the background.
    await vi.advanceTimersByTimeAsync(120_000);
    win.dispatchEvent(new Event("online"));
    await flush();
    expect(FakeWebSocket.instances).toHaveLength(1);

    becomeVisible();
    await flush();
    const second = FakeWebSocket.instances[1];
    expect(second).toBeDefined();
    second!.open();
    expect(onReconnect).toHaveBeenCalledTimes(1);
    lease.release();
  });

  it("does not open the socket when the token arrives with the app already hidden", async () => {
    win.VoxerAndroid = androidBridge;
    let resolveToken: ((token: string) => void) | undefined;
    const lease = acquireRoom({
      baseUrl: "https://rt.example",
      room: "user:bgtoken1",
      getToken: () =>
        new Promise<string | null>((resolve) => {
          resolveToken = resolve;
        }),
    });
    await flush();
    becomeHidden();
    resolveToken?.("token");
    await flush();
    expect(FakeWebSocket.instances).toHaveLength(0);
    becomeVisible();
    lease.release();
  });

  it("outside the app a hidden tab keeps its socket", async () => {
    const lease = acquireRoom({ baseUrl: "https://rt.example", room: "user:desktop1" });
    await flush();
    const socket = FakeWebSocket.instances[0]!;
    socket.open();

    becomeHidden();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(socket.readyState).toBe(FakeWebSocket.OPEN);
    expect(FakeWebSocket.instances).toHaveLength(1);
    becomeVisible();
    lease.release();
  });
});
