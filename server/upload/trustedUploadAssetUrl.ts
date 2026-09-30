import { r2PublicOrigin } from "@/lib/media/publicStorage";

export const isHttpsTrustedPublicUploadAssetUrl = (u: URL): boolean => {
  if (u.protocol !== "https:") return false;
  const r2 = r2PublicOrigin();
  return r2 !== null && u.origin === r2;
};
