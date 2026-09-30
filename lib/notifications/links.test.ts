import { describe, expect, it } from "vitest";
import { buildVoxPanelDetailHref } from "./links";

describe("buildVoxPanelDetailHref", () => {
  it("adds the comment anchor when there is one", () => {
    expect(buildVoxPanelDetailHref({ voxId: "abc", anchorUpper: "TAG1" })).toBe("/vox/abc#TAG1");
    expect(buildVoxPanelDetailHref({ voxId: "abc", anchorUpper: null })).toBe("/vox/abc");
  });

  it("can ask the detail page to mark reports as read", () => {
    expect(
      buildVoxPanelDetailHref(
        { voxId: "abc", anchorUpper: "TAG1" },
        { markModerationNotificationsRead: true },
      ),
    ).toBe("/vox/abc?denuncia=push#TAG1");
  });
});
