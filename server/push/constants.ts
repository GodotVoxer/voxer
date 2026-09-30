import { DAY_MS } from "@/lib/time";

export const PUSH_DEVICES_PER_USER_MAX = 10;

/** Caps the fan-out of a single push so a heavily followed vox stays bounded. */
export const PUSH_FANOUT_USERS_MAX = 200;

export const PUSH_SEND_CONCURRENCY = 20;

/** Pushes run inside `after()`, so a slow provider must not keep the request alive. */
export const PUSH_REQUEST_TIMEOUT_MS = 4000;

export const PUSH_DEVICE_STALE_MS = 90 * DAY_MS;

/** Consecutive non-fatal delivery failures after which a device token is dropped. */
export const PUSH_DEVICE_FAILURE_MAX = 10;

export const PUSH_DEVICE_PURGE_BATCH_MAX = 100;
