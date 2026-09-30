import sharp from "sharp";

/**
 * Posters captured by old clients before a frame was presented are fully transparent: plausible
 * size, invisible image. Only that counts as blank; an opaque black frame (a fade-in) is legitimate.
 */
export const posterImageBufferIsBlank = async (buffer: Buffer): Promise<boolean> => {
  try {
    const stats = await sharp(buffer).stats();
    const alpha = stats.channels[3];
    return alpha !== undefined && alpha.max === 0;
  } catch {
    return false;
  }
};
