/** S3-compatible endpoint: explicit, or derived from `R2_ACCOUNT_ID`. */
export const effectiveR2S3Endpoint = (): string | null => {
  const direct = process.env.R2_S3_ENDPOINT?.trim();
  if (direct) {
    return direct.replace(/\/+$/, "");
  }
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  if (accountId && /^[a-f0-9]{32}$/i.test(accountId)) {
    return `https://${accountId}.r2.cloudflarestorage.com`;
  }
  return null;
};

export const isR2StorageFullyConfigured = (): boolean =>
  Boolean(
    process.env.R2_ACCESS_KEY_ID?.trim() &&
    process.env.R2_SECRET_ACCESS_KEY?.trim() &&
    process.env.R2_BUCKET?.trim() &&
    effectiveR2S3Endpoint() &&
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim(),
  );
