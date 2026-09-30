import { realtimeMode, type RealtimeMode } from "@/lib/realtime/mode";
import { isStrongSocketBroadcastSecret } from "@/server/realtime/socketBroadcastSecret";

/**
 * A broadcast that never leaves the server breaks nothing visible: the request succeeds, native
 * push still arrives and client sockets stay `OPEN`, so screens just stop updating. This report
 * makes that condition queryable without ever returning the secret.
 */
export const BROADCAST_DEFAULT_TARGET = "http://127.0.0.1:3001";

export type BroadcastEnv = {
  REALTIME_BROADCAST_ENABLED?: string;
  SOCKET_SERVER_URL?: string;
  SOCKET_BROADCAST_SECRET?: string;
};

export type BroadcastConfigReport = {
  broadcastEnabled: boolean;
  targetHost: string | null;
  targetIsLocalDefault: boolean;
  secretConfigured: boolean;
  secretStrongEnough: boolean;
  /** What prevents events from going out, or `null` when the configuration is complete. */
  configProblem: string | null;
};

export type BroadcastHealthReport = BroadcastConfigReport & {
  /** Transport compiled into the client bundle. */
  clientMode: RealtimeMode;
  probe:
    | { kind: "skipped"; detail: string }
    | { kind: "reachable-authorized" }
    | { kind: "reachable-unauthorized"; status: number }
    | {
        kind: "unexpected-status";
        status: number;
        /** The Worker never answers 403; whatever sits in front of it does, and the body says who. */
        body: string;
        server: string | null;
        cfRay: string | null;
      }
    | { kind: "unreachable"; detail: string };
  ok: boolean;
};

const hostOf = (raw: string): string | null => {
  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
};

export const broadcastConfigReport = (env: BroadcastEnv): BroadcastConfigReport => {
  const broadcastEnabled = env.REALTIME_BROADCAST_ENABLED?.trim().toLowerCase() === "true";
  const rawTarget = env.SOCKET_SERVER_URL?.trim() || BROADCAST_DEFAULT_TARGET;
  const targetHost = hostOf(rawTarget);
  const targetIsLocalDefault = rawTarget.replace(/\/$/, "") === BROADCAST_DEFAULT_TARGET;
  const secret = env.SOCKET_BROADCAST_SECRET?.trim();
  const secretConfigured = Boolean(secret);
  const secretStrongEnough = isStrongSocketBroadcastSecret(secret);

  let configProblem: string | null = null;
  if (!broadcastEnabled) {
    configProblem = "REALTIME_BROADCAST_ENABLED is not 'true': no event is emitted.";
  } else if (!targetHost) {
    configProblem = "SOCKET_SERVER_URL is not a valid URL.";
  } else if (targetIsLocalDefault) {
    configProblem = `SOCKET_SERVER_URL is not set: falling back to ${BROADCAST_DEFAULT_TARGET}.`;
  } else if (!secretConfigured) {
    configProblem = "SOCKET_BROADCAST_SECRET is missing.";
  } else if (!secretStrongEnough) {
    configProblem = "SOCKET_BROADCAST_SECRET is shorter than the production minimum.";
  }

  return {
    broadcastEnabled,
    targetHost,
    targetIsLocalDefault,
    secretConfigured,
    secretStrongEnough,
    configProblem,
  };
};

/**
 * Deliberately invalid room: the Worker checks the secret before the room, so a 400 proves the
 * secret is accepted without emitting anything, and a 401 proves it is not.
 */
const PROBE_BODY = JSON.stringify({ room: "__health__", event: "__health__" });

export const broadcastHealthReport = async (): Promise<BroadcastHealthReport> => {
  const config = broadcastConfigReport({
    REALTIME_BROADCAST_ENABLED: process.env.REALTIME_BROADCAST_ENABLED,
    SOCKET_SERVER_URL: process.env.SOCKET_SERVER_URL,
    SOCKET_BROADCAST_SECRET: process.env.SOCKET_BROADCAST_SECRET,
  });
  if (config.configProblem) {
    return {
      ...config,
      clientMode: realtimeMode(),
      probe: { kind: "skipped", detail: config.configProblem },
      ok: false,
    };
  }

  const base = (process.env.SOCKET_SERVER_URL ?? BROADCAST_DEFAULT_TARGET)
    .trim()
    .replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/internal/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SOCKET_BROADCAST_SECRET?.trim() ?? ""}`,
      },
      body: PROBE_BODY,
      signal: AbortSignal.timeout(5_000),
    });
    const clientMode = realtimeMode();
    if (res.status === 400) {
      return { ...config, clientMode, probe: { kind: "reachable-authorized" }, ok: true };
    }
    if (res.status === 401) {
      return {
        ...config,
        clientMode,
        probe: { kind: "reachable-unauthorized", status: res.status },
        ok: false,
      };
    }
    return {
      ...config,
      clientMode,
      probe: {
        kind: "unexpected-status",
        status: res.status,
        body: (await res.text().catch(() => "")).slice(0, 400),
        server: res.headers.get("server"),
        cfRay: res.headers.get("cf-ray"),
      },
      ok: false,
    };
  } catch (err) {
    return {
      ...config,
      clientMode: realtimeMode(),
      probe: { kind: "unreachable", detail: err instanceof Error ? err.message : String(err) },
      ok: false,
    };
  }
};
