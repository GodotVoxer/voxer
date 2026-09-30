"use client";

import { useEffect } from "react";
import { usePresenceStore } from "@/features/presence/store";
import { isMockDemoMode } from "@/mocks/initMocks";
import { acquireRealtimeRoom } from "@/features/realtime/acquire";
import { getPresenceClientId } from "@/features/realtime/presenceClientId";
import { realtimePushEnabled } from "@/lib/realtime/mode";
import { PRESENCE_GLOBAL_ROOM } from "@/lib/realtime/rooms";

/** Simulated concurrency for screenshots and UI tests in the MSW demo. */
export const MOCK_DEMO_ONLINE_COUNT = 42;

export const GlobalPresenceBridge = () => {
  const setOnlineCount = usePresenceStore((s) => s.setOnlineCount);

  useEffect(() => {
    if (isMockDemoMode()) {
      setOnlineCount(MOCK_DEMO_ONLINE_COUNT);
      return;
    }

    if (!realtimePushEnabled()) {
      return;
    }

    let cancelled = false;
    let teardown: (() => void) | undefined;
    const clientId = getPresenceClientId();

    void acquireRealtimeRoom({ room: PRESENCE_GLOBAL_ROOM, clientId }).then((lease) => {
      if (!lease) return;
      if (cancelled) {
        lease.release();
        return;
      }

      const onUpdate = (data: unknown) => {
        if (
          typeof data === "object" &&
          data !== null &&
          "count" in data &&
          typeof (data as { count: unknown }).count === "number"
        ) {
          setOnlineCount((data as { count: number }).count);
        }
      };

      lease.on("presence:update", onUpdate);

      teardown = () => {
        lease.off("presence:update", onUpdate);
        lease.release();
      };
    });

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [setOnlineCount]);

  return null;
};
