/**
 * Realtime transport on Cloudflare Durable Objects. The server emits with
 * `POST /internal/emit` (`Authorization: Bearer <SOCKET_BROADCAST_SECRET>`, body `{ room, event, data }`,
 * see `server/realtime/broadcast.ts`). One room is one Durable Object (`idFromName(room)`) and clients
 * open one WebSocket per room. With the Hibernation API idle rooms use no compute and outgoing
 * messages are not billed: the cost is connections and broadcasts.
 */
import {
  INTERNAL_EMIT_EVENTS,
  isAllowedInternalEmitRoom,
  PRESENCE_GLOBAL_ROOM,
} from "../../lib/realtime/rooms";
import { isAllowedSocketOrigin } from "../../lib/realtime/socketOrigin";
import { verifySocketJoinToken } from "../../lib/realtime/socketToken";

export type Env = {
  ROOM: DurableObjectNamespace;
  SOCKET_BROADCAST_SECRET: string;
  AUTH_SECRET: string;
  /** Comma-separated site origins allowed to open sockets; unset disables the check. */
  ALLOWED_ORIGIN?: string;
};

/** Same as `server/realtime/broadcast.ts`: room, event and opaque data. */
type EmitBody = { room?: unknown; event?: unknown; data?: unknown };

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** Constant-time comparison, so response timing cannot leak the secret. */
const secretMatches = (given: string, expected: string): boolean => {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i += 1) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
};

const userIdFromRoom = (room: string): string | null =>
  room.startsWith("user:") ? room.slice("user:".length) : null;

export class RoomDurableObject implements DurableObject {
  private isPresenceRoom = false;
  private lastBroadcastMs = 0;
  private lastBroadcastCount = 0;
  private broadcastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {}

  private getPresenceCount(): number {
    const sockets = this.state.getWebSockets();
    const uniqueClients = new Set<string>();
    let untaggedCount = 0;
    for (const ws of sockets) {
      try {
        const att = ws.deserializeAttachment() as { clientId?: string } | null;
        if (att?.clientId) {
          uniqueClients.add(att.clientId);
        } else {
          untaggedCount += 1;
        }
      } catch {
        untaggedCount += 1;
      }
    }
    return uniqueClients.size + untaggedCount;
  }

  /** Presence broadcasts are throttled to 15 s so quick joins and leaves do not keep waking the object; new clients get their count right away. */
  private schedulePresenceBroadcast(): void {
    const now = Date.now();
    const THROTTLE_MS = 15_000;
    if (now - this.lastBroadcastMs >= THROTTLE_MS) {
      this.broadcastPresence();
    } else if (!this.broadcastTimer) {
      this.broadcastTimer = setTimeout(
        () => {
          this.broadcastTimer = null;
          this.broadcastPresence();
        },
        THROTTLE_MS - (now - this.lastBroadcastMs),
      );
    }
  }

  private broadcastPresence(): void {
    this.lastBroadcastMs = Date.now();
    const count = this.getPresenceCount();
    if (count === this.lastBroadcastCount) return;
    this.lastBroadcastCount = count;
    const frame = JSON.stringify({ event: "presence:update", data: { count } });
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(frame);
      } catch {
        // A dead connection must not stop the fan-out to the rest.
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/emit") {
      const { event, data } = (await request.json()) as { event: string; data: unknown };
      const frame = JSON.stringify({ event, data });
      let sent = 0;
      for (const ws of this.state.getWebSockets()) {
        try {
          ws.send(frame);
          sent += 1;
        } catch {
          // A dead connection must not stop the fan-out to the rest.
        }
      }
      return json({ ok: true, sent }, 200);
    }

    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return json({ error: "Expected WebSocket" }, 426);
    }

    const pair = new WebSocketPair();
    // `acceptWebSocket` (not `server.accept()`) is what enables hibernation.
    this.state.acceptWebSocket(pair[1]);

    const room = url.searchParams.get("room");
    if (room === PRESENCE_GLOBAL_ROOM) {
      this.isPresenceRoom = true;
      const clientId = url.searchParams.get("client")?.slice(0, 64);
      if (clientId) {
        try {
          pair[1].serializeAttachment({ clientId });
        } catch {
          // Runtime without attachment support
        }
      }
      const count = this.getPresenceCount();
      try {
        pair[1].send(JSON.stringify({ event: "presence:update", data: { count } }));
      } catch {
        // Ignore while not ready yet
      }
      this.schedulePresenceBroadcast();
    }

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  /** Clients send nothing but a keepalive ping; everything else is ignored. */
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    if (typeof message === "string" && message === "ping") ws.send("pong");
  }

  webSocketClose(ws: WebSocket, code: number, _reason: string, _wasClean: boolean): void {
    try {
      ws.close(code === 1006 ? 1000 : code);
    } catch {
      // Already closed.
    }
    if (this.isPresenceRoom) {
      this.schedulePresenceBroadcast();
    }
  }

  webSocketError(): void {
    // Hibernation closes the connection itself.
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/internal/emit") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

      const auth = request.headers.get("authorization") ?? "";
      const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
      if (!env.SOCKET_BROADCAST_SECRET || !secretMatches(token, env.SOCKET_BROADCAST_SECRET)) {
        return json({ error: "Unauthorized" }, 401);
      }

      let body: EmitBody;
      try {
        body = (await request.json()) as EmitBody;
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const { room, event, data } = body;
      // Rooms and events come from the shared allow-list in `lib/realtime/rooms.ts`.
      if (!isAllowedInternalEmitRoom(room)) return json({ error: "Invalid room" }, 400);
      if (typeof event !== "string" || !INTERNAL_EMIT_EVENTS.has(event)) {
        return json({ error: "Invalid event" }, 400);
      }

      const stub = env.ROOM.get(env.ROOM.idFromName(room));
      return stub.fetch("https://do/emit", {
        method: "POST",
        body: JSON.stringify({ event, data }),
      });
    }

    if (url.pathname === "/ws") {
      if (!isAllowedSocketOrigin(request.headers.get("origin"), env.ALLOWED_ORIGIN)) {
        return json({ error: "Forbidden" }, 403);
      }
      const room = url.searchParams.get("room");
      if (!isAllowedInternalEmitRoom(room)) return json({ error: "Invalid room" }, 400);

      // Only the private user room requires identity; vox rooms and the feed are public.
      const wantedUserId = userIdFromRoom(room);
      if (wantedUserId) {
        const joinToken = url.searchParams.get("token") ?? "";
        const tokenUserId = await verifySocketJoinToken(
          joinToken,
          new TextEncoder().encode(env.AUTH_SECRET),
        );
        if (!tokenUserId || tokenUserId !== wantedUserId) {
          return json({ error: "Forbidden" }, 403);
        }
      }

      const stub = env.ROOM.get(env.ROOM.idFromName(room));
      return stub.fetch(request);
    }

    if (url.pathname === "/health") return json({ ok: true }, 200);

    return json({ error: "Not found" }, 404);
  },
};
