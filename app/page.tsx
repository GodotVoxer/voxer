import type { Metadata } from "next";
import { preload } from "react-dom";
import { AppInitializer } from "@/components/Shell/AppInitializer";
import { PageShell } from "@/components/Shell/PageShell";
import { NsfwHomePromptDialog } from "@/components/Onboarding/NsfwHomePromptDialog";
import { VoxGrid } from "@/components/Vox/Grid/VoxGrid";
import { getSitePublicOriginUrl } from "@/lib/http/sitePublicOrigin";
import { HOME_FEED_PRELOAD_HREF } from "@/lib/vox/homeFeedPreload";

const homeOgDescription = "Voxer — un imageboard como la gente.";
const homeOgCoverUrl = "/vox-welcome.png";

export const generateMetadata = (): Metadata => {
  const metadataBase = getSitePublicOriginUrl();
  return {
    ...(metadataBase ? { metadataBase } : {}),
    openGraph: {
      title: "Voxer",
      description: homeOgDescription,
      type: "website",
      url: "/",
      siteName: "Voxer",
      images: [{ url: homeOgCoverUrl, alt: "Voxer" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Voxer",
      description: homeOgDescription,
      images: [homeOgCoverUrl],
    },
  };
};

const Home = () => {
  // The feed downloads while the JS loads; the grid's first request reuses it. Not in the demo: MSW
  // starts later, so the preload would reach the real handlers.
  if (process.env.NEXT_PUBLIC_USE_MOCKS !== "true") {
    preload(HOME_FEED_PRELOAD_HREF, { as: "fetch", crossOrigin: "use-credentials" });
  }
  return (
    <AppInitializer>
      <PageShell>
        <NsfwHomePromptDialog />
        <VoxGrid />
      </PageShell>
    </AppInitializer>
  );
};
export default Home;
