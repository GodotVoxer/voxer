import type { Metadata } from "next";
import { AppInitializer } from "@/components/Shell/AppInitializer";
import { PageShell } from "@/components/Shell/PageShell";
import { NsfwHomePromptDialog } from "@/components/Onboarding/NsfwHomePromptDialog";
import { VoxGrid } from "@/components/Vox/Grid/VoxGrid";
import { getSitePublicOriginUrl } from "@/lib/http/sitePublicOrigin";
import { loadInitialFeedPage } from "@/server/vox/initialFeedPage";

// Same window as the public first-page cache (`getVoxListCached.ts`): CDNs keep this HTML with the
// embedded data for at most 15 s and the server regenerates it at that pace.
export const revalidate = 15;

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

const Home = async () => {
  const initialPage = await loadInitialFeedPage(null);
  return (
    <AppInitializer>
      <PageShell>
        <NsfwHomePromptDialog />
        <VoxGrid initialPage={initialPage} />
      </PageShell>
    </AppInitializer>
  );
};
export default Home;
