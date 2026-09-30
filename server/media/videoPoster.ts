import { extractVideoPosterPngBuffer } from "@/server/media/extractVideoPosterFrame";
import { saveVideoPosterWebp } from "@/server/media/imageProcess";
import {
  VIDEO_POSTER_PLACEHOLDER_URL,
  isUsableVideoPosterUrl,
} from "@/server/media/videoPosterPlaceholder";
import { updateStoredMediaThumbnail } from "@/server/media/storedMediaByHash";
import type { VideoContainer } from "@/lib/media/videoFormat";

/**
 * Video thumbnail extracted by ffmpeg from the already stripped bytes. It is done on the server
 * because capturing in the browser (`<video>` + `drawImage`) is unreliable: some WebViews return an
 * empty canvas and some codecs never paint. Never throws: without a poster the placeholder is used.
 */
export const buildStrippedVideoPosterUrl = async (
  stripped: Buffer,
  safeExt: VideoContainer,
): Promise<string> => {
  try {
    const framePng = await extractVideoPosterPngBuffer(stripped, safeExt);
    return await saveVideoPosterWebp(framePng);
  } catch (e) {
    console.error("[video-poster] could not generate the thumbnail:", e);
    return VIDEO_POSTER_PLACEHOLDER_URL;
  }
};

/**
 * Poster for an already uploaded video (dedupe hit). Older rows stored the placeholder, which
 * publishing rejects as an external link, so one is generated now and saved on the row.
 */
export const ensureDedupedVideoPosterUrl = async (
  sha256Hex: string,
  storedThumbnailUrl: string,
  stripped: Buffer,
  safeExt: VideoContainer,
): Promise<string> => {
  if (
    isUsableVideoPosterUrl(storedThumbnailUrl) &&
    storedThumbnailUrl !== VIDEO_POSTER_PLACEHOLDER_URL
  ) {
    return storedThumbnailUrl;
  }
  const posterUrl = await buildStrippedVideoPosterUrl(stripped, safeExt);
  if (posterUrl !== storedThumbnailUrl) {
    await updateStoredMediaThumbnail(sha256Hex, posterUrl).catch((e) => {
      console.error("[video-poster] could not update the dedupe row:", e);
    });
  }
  return posterUrl;
};
