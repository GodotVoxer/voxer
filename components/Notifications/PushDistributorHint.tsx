"use client";

import { useMissingPushDistributor } from "@/hooks/device/useMissingPushDistributor";

const NTFY_FDROID_URL = "https://f-droid.org/packages/io.heckel.ntfy/";

/** The F-Droid build has no Google services: closed-app notifications need a UnifiedPush distributor. */
export const PushDistributorHint = () => {
  const missing = useMissingPushDistributor();
  if (!missing) return null;
  return (
    <p className="text-xs text-fg-subtle">
      Para recibir notificaciones con la app cerrada, instalá{" "}
      <a
        href={NTFY_FDROID_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-300 underline underline-offset-2 hover:text-brand-200"
      >
        ntfy
      </a>{" "}
      (o cualquier otra app de UnifiedPush) y volvé a Voxer.
    </p>
  );
};
