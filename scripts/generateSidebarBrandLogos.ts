/**
 * Derives the sidebar logos from `public/vox-welcome.png` (also the Open Graph image):
 * `vox-logo-dark.png` with the Android launcher icon colors (`voxer_icon_*` in `colors.xml`) and
 * `vox-logo-light.png` for the light theme, remapping luminance to keep antialiasing and texture.
 *
 *   npx tsx scripts/generateSidebarBrandLogos.ts
 */
import sharp from "sharp";

const SOURCE = "public/vox-welcome.png";

type Rgb = readonly [number, number, number];

const SOURCE_BACKGROUND: Rgb = [15, 23, 34];
const SOURCE_INK: Rgb = [127, 151, 159];

const VARIANTS: { target: string; background: Rgb; ink: Rgb }[] = [
  { target: "public/vox-logo-dark.png", background: [13, 29, 50], ink: [150, 172, 183] },
  { target: "public/vox-logo-light.png", background: [238, 242, 246], ink: [71, 85, 105] },
];

const luma = (r: number, g: number, b: number): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const main = async () => {
  const { data, info } = await sharp(SOURCE)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const backgroundLuma = luma(...SOURCE_BACKGROUND);
  const inkLuma = luma(...SOURCE_INK);
  for (const { target, background, ink } of VARIANTS) {
    const out = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i += 3) {
      const t = Math.min(
        1,
        Math.max(
          0,
          (luma(data[i], data[i + 1], data[i + 2]) - backgroundLuma) / (inkLuma - backgroundLuma),
        ),
      );
      for (let c = 0; c < 3; c++) {
        out[i + c] = Math.round(background[c] + (ink[c] - background[c]) * t);
      }
    }
    await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
      .png({ compressionLevel: 9, palette: true, quality: 100 })
      .toFile(target);
    console.log(`Logo written to ${target} (${info.width}×${info.height})`);
  }
};

void main();
