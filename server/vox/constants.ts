/** Counts every `Vox` row, soft-deleted included; creating past it hard-deletes the least recently active one. */
export const VOX_ACTIVE_DB_CAP = 3000;

/** `pg_advisory_xact_lock` key that serializes vox creation with cap eviction. */
export const VOX_CREATE_ADVISORY_LOCK_KEY = 1827364519;
