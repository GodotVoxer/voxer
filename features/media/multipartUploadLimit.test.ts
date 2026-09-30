import { describe, expect, it } from "vitest";
import {
  assertFitsHostingMultipartBodyLimit,
  HOSTING_MULTIPART_LIMIT_EXCEEDED_MESSAGE,
} from "./multipartUploadLimit";
import { HOSTING_MULTIPART_BODY_SAFE_MAX_BYTES } from "@/lib/media/uploadLimits";

describe("assertFitsHostingMultipartBodyLimit", () => {
  it("does not throw below the safe cap", () => {
    expect(() => assertFitsHostingMultipartBodyLimit(100)).not.toThrow();
    expect(() =>
      assertFitsHostingMultipartBodyLimit(HOSTING_MULTIPART_BODY_SAFE_MAX_BYTES),
    ).not.toThrow();
  });

  it("throws above the safe cap", () => {
    expect(() =>
      assertFitsHostingMultipartBodyLimit(HOSTING_MULTIPART_BODY_SAFE_MAX_BYTES + 1),
    ).toThrow(HOSTING_MULTIPART_LIMIT_EXCEEDED_MESSAGE);
  });
});
