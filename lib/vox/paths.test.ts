import { describe, expect, it } from "vitest";
import { absoluteUrl, voxCommentPath, voxPath } from "./paths";

describe("vox paths", () => {
  it("builds the vox path and the comment anchor", () => {
    expect(voxPath("abc123")).toBe("/vox/abc123");
    expect(voxCommentPath("abc123", "ab12")).toBe("/vox/abc123#AB12");
  });

  it("does not double the slash when joining the origin", () => {
    expect(absoluteUrl("https://voxer.example", "/vox/abc")).toBe("https://voxer.example/vox/abc");
    expect(absoluteUrl("https://voxer.example/", "/vox/abc")).toBe("https://voxer.example/vox/abc");
  });
});
