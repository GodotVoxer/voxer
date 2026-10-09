import { MINUTE_MS, SECOND_MS } from "@/lib/time";

// Content limits shared by the validators, the forms and the server.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const VOX_TITLE_MAX = 200;
export const VOX_DESCRIPTION_MAX = 8000;
export const VOX_AUTHOR_MAX = 80;
/** Stored media URLs: uploads and YouTube embeds. */
export const VOX_MEDIA_URL_MAX = 500;
export const VOX_YOUTUBE_URL_MAX = 200;
export const VOX_POLL_OPTION_MAX = 80;
/** Minimum time between two vox of the same user. */
export const VOX_CREATE_INTERVAL_MS = 5 * MINUTE_MS;
/** Uploads allowed per vox interval (e.g. a video and its poster), so storage is not filled without posting. */
export const VOX_MEDIA_UPLOADS_PER_WINDOW = 2;
/** Page size the home grid asks for; the public first page is cached per size. */
export const VOX_LIST_PAGE_SIZE = 24;
export const VOX_LIST_PAGE_MAX = 50;

export const COMMENT_BODY_MAX = 4000;
/** Lines allowed in a comment body after blank runs collapse: caps vertical spam. */
export const COMMENT_BODY_MAX_LINES = 60;
/** Comment excerpt shown in a bell row; the row clamps it to two lines anyway. */
export const NOTIFICATION_COMMENT_PREVIEW_MAX = 200;
export const COMMENT_DISPLAY_NAME_MAX = 80;
export const COMMENT_MEDIA_URL_MAX = 500;
/** Distinct `>>TAG` references allowed in one comment. */
export const COMMENT_REPLY_TAGS_MAX = 5;
export const COMMENT_LIST_PAGE_MAX = 250;
/** Minimum time between two comments of the same user. */
export const COMMENT_CREATE_INTERVAL_MS = 5 * SECOND_MS;
/**
 * Comment attachments get a looser window than vox so a video and its poster fit in one burst.
 * @alias
 */
export const COMMENT_MEDIA_UPLOAD_WINDOW_MS = COMMENT_CREATE_INTERVAL_MS;
export const COMMENT_MEDIA_UPLOADS_PER_WINDOW = 2;
export const MY_COMMENTS_SEARCH_MAX = 200;

/** Optional note a user can add to a report. */
export const REPORT_DETAILS_MAX = 300;
