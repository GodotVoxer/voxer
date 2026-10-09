import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { VoxDetailView } from "@/components/Vox/Detail/VoxDetailView";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getVoxDetailCached } from "@/server/vox/getVoxDetailCached";
import { withViewerFlags } from "@/server/vox/getDetailApi";
import { serializeVoxDetailForClient } from "@/server/vox/serializeDetailForClient";
import { isDbConfigured } from "@/server/http/apiErrors";
import { resolveSiteOriginUrl } from "@/server/http/resolveSiteOriginUrl";
import { isSensitiveVoxCategory } from "@/lib/vox/sensitiveCategories";
import { truncateOgDescription } from "@/lib/format/truncate";
import { youtubeThumbnailUrl } from "@/lib/media/youtube";
import { voxPath } from "@/lib/vox/paths";
import { voxCommentsPreloadHref } from "@/lib/vox/commentsPreload";

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    denuncia?: string | string[];
  }>;
};

const OG_DESCRIPTION_MAX = 180;

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { id } = await params;
  const metadataBase = await resolveSiteOriginUrl();
  const baseMeta = metadataBase ? { metadataBase } : {};

  if (!isDbConfigured()) {
    return { ...baseMeta, title: "Vox" };
  }

  const voxRow = await getVoxDetailCached(id, null);
  if (!voxRow) {
    notFound();
  }

  const description = truncateOgDescription(voxRow.description, OG_DESCRIPTION_MAX);
  const thumbnail = voxRow.thumbnailUrl?.trim() ?? "";
  // Link previews render fully in the recipient's chat: NSFW shares carry no image, like the push.
  const imageUrl = isSensitiveVoxCategory(voxRow.category)
    ? ""
    : thumbnail || (voxRow.youtubeVideoId ? youtubeThumbnailUrl(voxRow.youtubeVideoId, "hq") : "");
  const images = imageUrl !== "" ? [{ url: imageUrl, alt: voxRow.title }] : undefined;

  return {
    ...baseMeta,
    title: voxRow.title,
    description,
    openGraph: {
      title: voxRow.title,
      description,
      type: "article",
      url: voxPath(id),
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: voxRow.title,
      description,
      ...(images ? { images: images.map((img) => img.url) } : {}),
    },
  };
};

const VoxPage = async ({ params, searchParams }: Props) => {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const markModerationNotificationsRead = query.denuncia === "push";

  if (!isDbConfigured()) {
    return (
      <VoxDetailView
        key={id}
        id={id}
        markModerationNotificationsRead={markModerationNotificationsRead}
      />
    );
  }

  const [sessionUserId, publicVoxRow] = await Promise.all([
    getSessionUserIdFromCookies(),
    getVoxDetailCached(id, null),
  ]);
  const voxRow =
    publicVoxRow && sessionUserId
      ? await withViewerFlags(publicVoxRow, sessionUserId)
      : publicVoxRow;

  if (!voxRow) {
    notFound();
  }

  // Without it the comments wait for hydration: a second round trip to the origin after the HTML.
  preload(voxCommentsPreloadHref(id), { as: "fetch", crossOrigin: "use-credentials" });

  const initialVox = serializeVoxDetailForClient(voxRow);

  return (
    <VoxDetailView
      key={id}
      id={id}
      initialVox={initialVox}
      markModerationNotificationsRead={markModerationNotificationsRead}
    />
  );
};

export default VoxPage;
