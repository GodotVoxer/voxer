import { describe, expect, it } from "vitest";
import { parseVoxHref, shouldNavigateByHash } from "@/features/vox/detail/anchorNavigation";

describe("parseVoxHref", () => {
  it("splits route and anchor", () => {
    expect(parseVoxHref("/vox/abc#TAG1")).toEqual({ path: "/vox/abc", hash: "TAG1" });
  });
  it("leaves the hash empty without an anchor", () => {
    expect(parseVoxHref("/vox/abc")).toEqual({ path: "/vox/abc", hash: "" });
  });
});

describe("shouldNavigateByHash", () => {
  it("uses the hash when already on that vox and the anchor changes", () => {
    expect(shouldNavigateByHash("/vox/abc#TAG2", "/vox/abc", "#TAG1")).toBe(true);
    expect(shouldNavigateByHash("/vox/abc#TAG1", "/vox/abc", "")).toBe(true);
  });

  it("does not when the vox differs: that needs a real navigation", () => {
    expect(shouldNavigateByHash("/vox/otro#TAG1", "/vox/abc", "#TAG1")).toBe(false);
  });

  it("does not without an anchor", () => {
    expect(shouldNavigateByHash("/vox/abc", "/vox/abc", "")).toBe(false);
  });

  it("does not when the anchor is already current", () => {
    expect(shouldNavigateByHash("/vox/abc#TAG1", "/vox/abc", "#TAG1")).toBe(false);
  });
});
