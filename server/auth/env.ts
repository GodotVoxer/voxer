export const isAuthSecretConfigured = (): boolean => {
  const raw = process.env.AUTH_SECRET?.trim();
  return Boolean(raw && raw.length >= 32);
};
