import { NextResponse } from "next/server";
import {
  buildAndroidAssetLinks,
  parseAndroidFingerprints,
  parseAndroidPackageNames,
} from "@/lib/native/assetLinks";

/**
 * Served from a handler rather than `public/` because fingerprints differ per channel (debug, release,
 * store signing): they come from an environment variable, not a commit. Google does not follow
 * redirects when verifying, so this must answer 200 on the exact host the intent filter declares.
 */
export const GET = () => {
  const statements = buildAndroidAssetLinks({
    packageNames: parseAndroidPackageNames(process.env.ANDROID_PACKAGE_NAMES),
    fingerprints: parseAndroidFingerprints(process.env.ANDROID_APP_FINGERPRINTS),
  });
  return NextResponse.json(statements, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
  });
};
