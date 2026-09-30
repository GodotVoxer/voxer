"use client";

import { isRunningInVoxerAndroid } from "@/features/native/androidBridge";
import { nextReconnectDelayMs } from "@/features/realtime/backoff";
import { roomWebSocketUrl } from "@/features/realtime/roomUrl";

export type RoomEventHandler = (data: unknown) => void;

export type RoomLease = {
  on: (event: string, handler: RoomEventHandler) => void;
  off: (event: string, handler: RoomEventHandler) => void;
  onReconnect: (handler: () => void) => void;
  offReconnect: (handler: () => void) => void;
  release: () => void;
};

type Entry = {
  socket: WebSocket | null;
  refs: number;
  attempt: number;
  everConnected: boolean;
  closed: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  /** A `connect` is in flight (e.g. waiting for the token); a second one would open an extra socket. */
  connecting: boolean;
  keepalive: ReturnType<typeof setInterval> | null;
  probe: ReturnType<typeof setTimeout> | null;
  /** Gives up on the current socket and reconnects without waiting for its `close` event. */
  abandon: ((reason: string) => void) | null;
  handlers: Map<string, Set<RoomEventHandler>>;
  reconnectHandlers: Set<() => void>;
  /** A ping awaits its pong: if the next tick arrives without one, the connection is dead. */
  awaitingPong: boolean;
  getToken?: () => Promise<string | null>;
  clientId?: string | null;
};

/**
 * Every ping wakes the Durable Object and is billed, so the interval is long. Half-open connections
 * that still say `OPEN` are also caught by an immediate probe when focus or network returns.
 */
const KEEPALIVE_MS = 60_000;
/** How long to wait for the pong after focus or network returns before calling the connection dead. */
const RESUME_PROBE_TIMEOUT_MS = 5_000;

const entries = new Map<string, Entry>();

/**
 * In the Android app no socket stays open in the background: every Worker frame (presence, site-wide
 * `feed:home` activity) wakes the phone's radio even with the WebView paused. Notifications keep
 * arriving through FCM; on return every room reconnects and catches up through `onReconnect`.
 */
let suspendedInBackground = false;

/**
 * One connection per room, shared by the consumers of a tab. With Durable Objects the room is the URL,
 * so there is no join/leave. The user room token is fetched on every attempt and never cached: it
 * lives 120 s and a stale one would fail right when reconnecting.
 */
export const acquireRoom = (opts: {
  baseUrl: string;
  room: string;
  getToken?: () => Promise<string | null>;
  clientId?: string | null;
}): RoomLease => {
  const key = `${opts.baseUrl}|${opts.room}`;
  let entry = entries.get(key);
  if (!entry) {
    entry = {
      socket: null,
      refs: 0,
      attempt: 0,
      everConnected: false,
      closed: false,
      timer: null,
      connecting: false,
      keepalive: null,
      probe: null,
      abandon: null,
      handlers: new Map(),
      reconnectHandlers: new Set(),
      awaitingPong: false,
      getToken: opts.getToken,
      clientId: opts.clientId,
    };
    entries.set(key, entry);
    void connect(key, entry, opts.baseUrl, opts.room);
  }
  const current = entry;
  current.refs += 1;

  let released = false;
  return {
    on: (event, handler) => {
      const set = current.handlers.get(event) ?? new Set();
      set.add(handler);
      current.handlers.set(event, set);
    },
    off: (event, handler) => {
      current.handlers.get(event)?.delete(handler);
    },
    onReconnect: (handler) => {
      current.reconnectHandlers.add(handler);
    },
    offReconnect: (handler) => {
      current.reconnectHandlers.delete(handler);
    },
    release: () => {
      if (released) return;
      released = true;
      current.refs -= 1;
      if (current.refs > 0) return;
      if (entries.get(key) !== current) return;
      entries.delete(key);
      teardown(current);
    },
  };
};

const clearProbe = (entry: Entry) => {
  if (entry.probe) clearTimeout(entry.probe);
  entry.probe = null;
};

const teardown = (entry: Entry) => {
  entry.closed = true;
  entry.connecting = false;
  entry.abandon = null;
  clearProbe(entry);
  if (entry.timer) clearTimeout(entry.timer);
  if (entry.keepalive) clearInterval(entry.keepalive);
  entry.timer = null;
  entry.keepalive = null;
  entry.handlers.clear();
  entry.reconnectHandlers.clear();
  try {
    entry.socket?.close(1000);
  } catch {
    /* already closed */
  }
  entry.socket = null;
};

const scheduleReconnect = (key: string, entry: Entry, baseUrl: string, room: string) => {
  if (entry.closed || entry.timer || entry.connecting || suspendedInBackground) return;
  const delay = nextReconnectDelayMs(entry.attempt);
  entry.attempt += 1;
  entry.timer = setTimeout(() => {
    entry.timer = null;
    void connect(key, entry, baseUrl, room);
  }, delay);
};

const connect = async (key: string, entry: Entry, baseUrl: string, room: string) => {
  if (entry.closed || entry.connecting || entries.get(key) !== entry) return;
  if (suspendedInBackground) return;

  entry.connecting = true;
  let token: string | null = null;
  if (entry.getToken) {
    token = await entry.getToken().catch(() => null);
    entry.connecting = false;
    if (entry.closed) return;
    if (!token) {
      // Without a token the private room cannot be joined: retry with backoff.
      scheduleReconnect(key, entry, baseUrl, room);
      return;
    }
  }
  entry.connecting = false;
  // The token may arrive with the app already in the background: `retryNow` reopens on return.
  if (suspendedInBackground) return;

  const url = roomWebSocketUrl(baseUrl, room, token, entry.clientId);
  if (!url) return;

  let socket: WebSocket;
  try {
    socket = new WebSocket(url);
  } catch {
    scheduleReconnect(key, entry, baseUrl, room);
    return;
  }
  entry.socket = socket;

  socket.addEventListener("open", () => {
    if (entry.closed) {
      socket.close(1000);
      return;
    }
    const reconnected = entry.everConnected;
    entry.everConnected = true;
    entry.attempt = 0;
    entry.awaitingPong = false;
    const keepalive = setInterval(() => {
      // A replaced socket must not keep watching the current one: its tick would call a healthy
      // connection dead (`awaitingPong` is shared) and reconnect for nothing.
      if (entry.socket !== socket) {
        clearInterval(keepalive);
        return;
      }
      // A half-open connection (suspend, NAT timeout, dropped wifi) still says OPEN and accepts `send`,
      // so without checking the pong the client would stay silent forever.
      if (entry.awaitingPong) {
        entry.abandon?.("sin respuesta al ping");
        return;
      }
      try {
        if (socket.readyState !== WebSocket.OPEN) return;
        entry.awaitingPong = true;
        socket.send("ping");
      } catch {
        /* the reconnect takes care of it */
      }
    }, KEEPALIVE_MS);
    entry.keepalive = keepalive;
    if (reconnected) {
      for (const handler of [...entry.reconnectHandlers]) handler();
    }
  });

  socket.addEventListener("message", (ev: MessageEvent) => {
    // Any incoming traffic proves the connection is alive, not only the pong.
    entry.awaitingPong = false;
    clearProbe(entry);
    if (typeof ev.data !== "string" || ev.data === "pong") return;
    let frame: { event?: unknown; data?: unknown };
    try {
      frame = JSON.parse(ev.data) as { event?: unknown; data?: unknown };
    } catch {
      return;
    }
    if (typeof frame.event !== "string") return;
    const set = entry.handlers.get(frame.event);
    if (!set) return;
    for (const handler of [...set]) handler(frame.data);
  });

  const onGone = () => {
    // A late `close` from a replaced socket must not stop the current keepalive or null out
    // `entry.socket` while a live connection exists.
    if (entry.socket !== socket) return;
    entry.awaitingPong = false;
    clearProbe(entry);
    if (entry.keepalive) clearInterval(entry.keepalive);
    entry.keepalive = null;
    if (entry.closed) return;
    entry.socket = null;
    scheduleReconnect(key, entry, baseUrl, room);
  };
  socket.addEventListener("close", onGone);
  socket.addEventListener("error", onGone);
  // On a half-open connection `close()` waits for a server close that never comes: detach the
  // listeners (so a late `close` cannot hit the new socket) and reconnect now.
  entry.abandon = (reason) => {
    if (entry.socket !== socket) return;
    socket.removeEventListener("close", onGone);
    socket.removeEventListener("error", onGone);
    entry.abandon = null;
    try {
      socket.close(4000, reason);
    } catch {
      /* already closed */
    }
    onGone();
  };
};

/** After a tab or app suspend the connection may still say OPEN without being alive; probe it now with a ping. */
const probeOpenSocket = (entry: Entry, socket: WebSocket) => {
  if (entry.probe || socket.readyState !== WebSocket.OPEN) return;
  try {
    entry.awaitingPong = true;
    socket.send("ping");
  } catch {
    return;
  }
  entry.probe = setTimeout(() => {
    entry.probe = null;
    if (entry.socket !== socket || !entry.awaitingPong) return;
    entry.abandon?.("sin respuesta al volver");
  }, RESUME_PROBE_TIMEOUT_MS);
};

/** When the network or focus returns, retry right away instead of waiting for the backoff. */
if (typeof window !== "undefined") {
  const retryNow = () => {
    for (const [key, entry] of entries) {
      if (entry.closed || entry.connecting) continue;
      if (entry.socket) {
        if (entry.socket.readyState === WebSocket.OPEN) {
          probeOpenSocket(entry, entry.socket);
          continue;
        }
        if (entry.socket.readyState === WebSocket.CONNECTING) continue;
        entry.abandon?.("cerrado al volver");
        if (entry.socket) continue;
      }
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = null;
      }
      entry.attempt = 0;
      const sep = key.lastIndexOf("|");
      void connect(key, entry, key.slice(0, sep), key.slice(sep + 1));
    }
  };
  const suspendAll = () => {
    suspendedInBackground = true;
    for (const entry of entries.values()) {
      if (entry.closed) continue;
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = null;
      }
      entry.abandon?.("segundo plano");
    }
  };
  window.addEventListener("online", () => {
    if (!suspendedInBackground) retryNow();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      suspendedInBackground = false;
      retryNow();
      return;
    }
    // On desktop a hidden tab still needs its socket: the title counter and the notification sound
    // depend on it, and there is no native push to replace it.
    if (isRunningInVoxerAndroid(window)) suspendAll();
  });
}
