import { DAY_MS } from "@/lib/time";

/** How long a soft-deleted vox or comment can still be restored before it is purged with its media. */
export const SOFT_DELETE_GRACE_MS = 7 * DAY_MS;

/** Rows hard-deleted per purge run, applied separately to vox and comments. */
export const PURGE_PER_CREATE_BATCH_MAX = 100;
