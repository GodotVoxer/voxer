import { describe, expect, it } from "vitest";
import { NEXT_IMAGE_LOCAL_PATHNAMES } from "./nextImageLocalPaths";
import { SIDEBAR_BRAND_LOGO_URL } from "@/features/theme/sidebarBrandLogoCrop";
describe("NEXT_IMAGE_LOCAL_PATHNAMES", () => {
  it("includes uploads and the assets used by VoxCard", () => {
    expect(NEXT_IMAGE_LOCAL_PATHNAMES).toContain("/uploads/**");
    expect(NEXT_IMAGE_LOCAL_PATHNAMES).toContain("/vox-welcome.png");
    expect(NEXT_IMAGE_LOCAL_PATHNAMES).toContain("/video-thumb.svg");
  });

  it("includes the sidebar logo of each theme", () => {
    for (const url of Object.values(SIDEBAR_BRAND_LOGO_URL)) {
      expect(NEXT_IMAGE_LOCAL_PATHNAMES).toContain(url);
    }
  });
});
