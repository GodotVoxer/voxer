/** Tailwind classes for the main media in the vox detail sidebar. */

/**
 * At `lg` the sidebar scrolls on its own, so a tall video or image is capped to the viewport and its
 * width becomes `auto` so the crop leaves no side bands. Smaller screens are unchanged.
 */
const VOX_DETAIL_MEDIA_DESKTOP_FIT = "lg:w-auto lg:max-h-[min(62vh,720px)]";

export const VOX_DETAIL_MEDIA_IMAGE_CLASS = `w-full h-auto max-w-full max-h-[min(200vh,2800px)] rounded-lg border border-fg/10 object-contain ${VOX_DETAIL_MEDIA_DESKTOP_FIT}`;

export const VOX_DETAIL_MEDIA_VIDEO_CLASS = `mx-auto block w-full max-w-full max-h-[min(200vh,2800px)] h-auto rounded-lg border border-fg/10 object-contain ${VOX_DETAIL_MEDIA_DESKTOP_FIT}`;

/** Wrappers shrink to the capped media at `lg` and stay centered in the column. */
export const VOX_DETAIL_MEDIA_WRAPPER_CLASS = "lg:w-fit lg:mx-auto";
