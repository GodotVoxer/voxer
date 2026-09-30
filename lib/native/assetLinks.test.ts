import { describe, expect, it } from "vitest";
import {
  buildAndroidAssetLinks,
  DEFAULT_ANDROID_PACKAGE_NAMES,
  parseAndroidFingerprints,
  parseAndroidPackageNames,
} from "@/lib/native/assetLinks";

const FP_A =
  "A1:B2:C3:D4:E5:F6:07:18:29:3A:4B:5C:6D:7E:8F:90:A1:B2:C3:D4:E5:F6:07:18:29:3A:4B:5C:6D:7E:8F:90";
const FP_B =
  "11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00";

describe("parseAndroidFingerprints", () => {
  it("uppercases and accepts several comma-separated values", () => {
    expect(parseAndroidFingerprints(`${FP_A.toLowerCase()}, ${FP_B}`)).toEqual([FP_A, FP_B]);
  });

  it("drops malformed fingerprints and keeps the valid ones", () => {
    expect(parseAndroidFingerprints(`${FP_A},no-es-una-huella,AA:BB`)).toEqual([FP_A]);
  });

  it("deduplicates", () => {
    expect(parseAndroidFingerprints(`${FP_A},${FP_A.toLowerCase()}`)).toEqual([FP_A]);
  });

  it("returns an empty list without the variable", () => {
    expect(parseAndroidFingerprints(undefined)).toEqual([]);
    expect(parseAndroidFingerprints("")).toEqual([]);
    expect(parseAndroidFingerprints("   ")).toEqual([]);
  });
});

describe("parseAndroidPackageNames", () => {
  it("falls back to the default packages without the variable", () => {
    expect(parseAndroidPackageNames(undefined)).toEqual([...DEFAULT_ANDROID_PACKAGE_NAMES]);
    expect(parseAndroidPackageNames("garbage without dots")).toEqual([
      ...DEFAULT_ANDROID_PACKAGE_NAMES,
    ]);
  });

  it("accepts an explicit list", () => {
    expect(parseAndroidPackageNames("pro.voxer.app, pro.voxer.app.debug")).toEqual([
      "pro.voxer.app",
      "pro.voxer.app.debug",
    ]);
  });
});

describe("buildAndroidAssetLinks", () => {
  it("builds the statement in the exact shape Google validates", () => {
    expect(
      buildAndroidAssetLinks({ packageNames: ["pro.voxer.app"], fingerprints: [FP_A] }),
    ).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "pro.voxer.app",
          sha256_cert_fingerprints: [FP_A],
        },
      },
    ]);
  });

  it("emits one statement per package", () => {
    const out = buildAndroidAssetLinks({
      packageNames: ["pro.voxer.app", "pro.voxer.app.debug"],
      fingerprints: [FP_A, FP_B],
    });
    expect(out).toHaveLength(2);
    expect(out.map((s) => s.target.package_name)).toEqual(["pro.voxer.app", "pro.voxer.app.debug"]);
    expect(out[0]?.target.sha256_cert_fingerprints).toEqual([FP_A, FP_B]);
  });

  it("publishes nothing without fingerprints instead of an invalid statement", () => {
    expect(buildAndroidAssetLinks({ packageNames: ["pro.voxer.app"], fingerprints: [] })).toEqual(
      [],
    );
  });
});
