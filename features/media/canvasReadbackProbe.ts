/** Each color fills a solid block; only block centers are compared. */
const PROBE_COLORS: readonly (readonly [number, number, number])[] = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 255],
  [0, 0, 0],
  [255, 255, 0],
  [0, 255, 255],
  [255, 0, 255],
];
const PROBE_BLOCK_PX = 3;
const PROBE_WIDTH_PX = PROBE_COLORS.length * PROBE_BLOCK_PX;
const PROBE_HEIGHT_PX = PROBE_BLOCK_PX;
/** Firefox's canvas randomization flips the two lowest bits of a few channels. */
const PROBE_CHANNEL_TOLERANCE = 3;

/** RGBA pixels of the probe as `getImageData` should return them. */
export const expectedProbePixels = (): Uint8ClampedArray => {
  const data = new Uint8ClampedArray(PROBE_WIDTH_PX * PROBE_HEIGHT_PX * 4);
  for (let y = 0; y < PROBE_HEIGHT_PX; y++) {
    for (let x = 0; x < PROBE_WIDTH_PX; x++) {
      const [r, g, b] = PROBE_COLORS[Math.floor(x / PROBE_BLOCK_PX)];
      data.set([r, g, b, 255], (y * PROBE_WIDTH_PX + x) * 4);
    }
  }
  return data;
};

/**
 * Block centers have identical neighbors, so Safari's noise injection leaves them alone; Firefox's
 * fingerprinting placeholder (random or white pixels) never matches.
 */
export const probePixelsAreFaithful = (data: ArrayLike<number>): boolean => {
  if (data.length !== PROBE_WIDTH_PX * PROBE_HEIGHT_PX * 4) return false;
  const center = Math.floor(PROBE_BLOCK_PX / 2);
  return PROBE_COLORS.every((color, i) => {
    const offset = (center * PROBE_WIDTH_PX + i * PROBE_BLOCK_PX + center) * 4;
    const channelsMatch = color.every(
      (value, c) => Math.abs(data[offset + c] - value) <= PROBE_CHANNEL_TOLERANCE,
    );
    return channelsMatch && data[offset + 3] === 255;
  });
};

/**
 * Privacy browsers (Tor, Mullvad, LibreWolf, Firefox with `resistFingerprinting`) answer canvas
 * reads with fake pixels, and `toBlob` would encode them as the uploaded image.
 */
export const canvasReadbackIsFaithful = (): boolean => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = PROBE_WIDTH_PX;
    canvas.height = PROBE_HEIGHT_PX;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    const probe = ctx.createImageData(PROBE_WIDTH_PX, PROBE_HEIGHT_PX);
    probe.data.set(expectedProbePixels());
    ctx.putImageData(probe, 0, 0);
    return probePixelsAreFaithful(ctx.getImageData(0, 0, PROBE_WIDTH_PX, PROBE_HEIGHT_PX).data);
  } catch {
    return false;
  }
};
