/** SHA-256 of the signing certificate in Google's format: uppercase hex separated by `:`. */
const SHA256_FINGERPRINT_RE = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export const DEFAULT_ANDROID_PACKAGE_NAMES = ["pro.voxer.app", "pro.voxer.app.debug"] as const;

export type AssetLinkStatement = {
  relation: string[];
  target: {
    namespace: "android_app";
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
};

export const parseAndroidFingerprints = (raw: string | undefined): string[] => {
  const seen = new Set<string>();
  for (const part of (raw ?? "").split(",")) {
    const value = part.trim().toUpperCase();
    if (SHA256_FINGERPRINT_RE.test(value)) seen.add(value);
  }
  return [...seen];
};

export const parseAndroidPackageNames = (raw: string | undefined): string[] => {
  const parsed = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(s));
  return parsed.length > 0 ? [...new Set(parsed)] : [...DEFAULT_ANDROID_PACKAGE_NAMES];
};

/**
 * Returns `[]` without valid fingerprints: one malformed fingerprint fails Android's `autoVerify`
 * for the whole group, and the app stops opening links.
 */
export const buildAndroidAssetLinks = (input: {
  packageNames: readonly string[];
  fingerprints: readonly string[];
}): AssetLinkStatement[] => {
  if (input.fingerprints.length === 0) return [];
  return input.packageNames.map((packageName) => ({
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: packageName,
      sha256_cert_fingerprints: [...input.fingerprints],
    },
  }));
};
