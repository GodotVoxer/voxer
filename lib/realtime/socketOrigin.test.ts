import { describe, expect, it } from "vitest";
import { isAllowedSocketOrigin } from "@/lib/realtime/socketOrigin";

describe("isAllowedSocketOrigin", () => {
  it("allows everything when no origin is configured", () => {
    expect(isAllowedSocketOrigin("https://evil.example", undefined)).toBe(true);
    expect(isAllowedSocketOrigin("https://evil.example", "")).toBe(true);
  });

  it("allows the configured origins, ignoring a trailing slash", () => {
    const allowed = "https://www.voxer.pro/, https://staging.voxer.pro";
    expect(isAllowedSocketOrigin("https://www.voxer.pro", allowed)).toBe(true);
    expect(isAllowedSocketOrigin("https://staging.voxer.pro", allowed)).toBe(true);
  });

  it("rejects pages of other sites", () => {
    expect(isAllowedSocketOrigin("https://evil.example", "https://www.voxer.pro")).toBe(false);
    expect(isAllowedSocketOrigin("https://voxer.pro", "https://www.voxer.pro")).toBe(false);
    expect(isAllowedSocketOrigin("null", "https://www.voxer.pro")).toBe(false);
  });

  it("lets non-browser handshakes without Origin through", () => {
    expect(isAllowedSocketOrigin(null, "https://www.voxer.pro")).toBe(true);
  });

  it("ignores malformed entries", () => {
    expect(isAllowedSocketOrigin("https://evil.example", "not a url")).toBe(true);
    expect(isAllowedSocketOrigin("https://evil.example", "not a url, https://www.voxer.pro")).toBe(
      false,
    );
  });
});
