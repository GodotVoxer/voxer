import { lookup as dnsLookup } from "node:dns";
import { Agent, request } from "node:https";
import type { LookupFunction } from "node:net";
import { generateRequestDetails } from "web-push";
import { PUSH_REQUEST_TIMEOUT_MS } from "@/server/push/constants";
import { buildUnifiedPushData, pushTtlSeconds, type VoxerPushPayload } from "@/server/push/payload";
import { isAllowedUnifiedPushEndpoint, isPublicIpAddress } from "@/server/push/unifiedPushEndpoint";
import { classifyWebPushFailure } from "@/server/push/webPushErrors";
import {
  readVapidDetails,
  topicFor,
  type WebPushSendOutcome,
  type WebPushTarget,
} from "@/server/push/webPushClient";

/** Checked at connection time, so a hostname cannot resolve to an internal address (DNS rebinding included). */
export const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) {
      callback(err, []);
      return;
    }
    const first = addresses[0];
    if (!first || !addresses.every((a) => isPublicIpAddress(a.address))) {
      callback(new Error(`${hostname} does not resolve to public addresses only`), []);
      return;
    }
    if (options.all) callback(null, addresses);
    else callback(null, first.address, first.family);
  });
};

const unifiedPushAgent = new Agent({ lookup: publicOnlyLookup });

/**
 * One message, one subscription, with the same encryption and VAPID signature as browser Web Push.
 * The request is made here rather than by `web-push` to control it fully: public addresses only,
 * no redirects, a timeout, and the response body is never read. Never throws.
 */
export const sendUnifiedPushMessage = async (
  target: WebPushTarget,
  payload: VoxerPushPayload,
): Promise<WebPushSendOutcome> => {
  const vapidDetails = readVapidDetails();
  if (!vapidDetails) return { ok: false, failure: "auth" };
  if (!isAllowedUnifiedPushEndpoint(target.endpoint)) return { ok: false, failure: "invalid" };

  let details: ReturnType<typeof generateRequestDetails>;
  try {
    details = generateRequestDetails(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      buildUnifiedPushData(payload),
      {
        vapidDetails,
        TTL: pushTtlSeconds(payload.kind),
        urgency: "high",
        topic: topicFor(payload.collapseKey),
      },
    );
  } catch {
    // Keys that cannot encrypt: the registration is broken.
    return { ok: false, failure: "invalid" };
  }

  return new Promise((resolve) => {
    const req = request(
      details.endpoint,
      {
        method: details.method,
        headers: details.headers,
        agent: unifiedPushAgent,
        timeout: PUSH_REQUEST_TIMEOUT_MS,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        res.destroy();
        resolve(
          status >= 200 && status < 300
            ? { ok: true }
            : { ok: false, failure: classifyWebPushFailure(status) },
        );
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    // Network failure, timeout or a blocked address: the subscription may still be fine.
    req.on("error", () => resolve({ ok: false, failure: "retryable" }));
    req.end(details.body ?? undefined);
  });
};
