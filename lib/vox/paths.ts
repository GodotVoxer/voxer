export const voxPath = (voxId: string): string => `/vox/${voxId}`;

/** The anchor is the comment's public tag, which the detail page scrolls to. */
export const voxCommentPath = (voxId: string, publicTag: string): string =>
  `${voxPath(voxId)}#${publicTag.toUpperCase()}`;

export const absoluteUrl = (origin: string, path: string): string =>
  `${origin.replace(/\/+$/, "")}${path}`;
