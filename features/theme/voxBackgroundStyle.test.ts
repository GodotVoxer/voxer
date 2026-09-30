import { afterEach, describe, expect, it, vi } from "vitest";
import { voxBackgroundStyle } from "./voxBackgroundStyle";

const URL_OK = "https://media.voxer.pro/theme-bg/3f2a1c4e-9b7d-4e21-8a6f-0c1d2e3f4a5b.webp";
const image = { kind: "image", assetId: "classet1", fit: "cover", dimPct: 40 };

describe("voxBackgroundStyle", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("solid goes as background-color and gradient as background-image", () => {
    expect(voxBackgroundStyle({ kind: "solid", color: "#101010" })).toEqual({
      backgroundColor: "#101010",
    });
    expect(
      voxBackgroundStyle({
        kind: "gradient",
        type: "radial",
        angleDeg: 0,
        stops: [
          { color: "#000000", pos: 0 },
          { color: "#ffffff", pos: 100 },
        ],
      }),
    ).toEqual({ backgroundImage: "radial-gradient(circle at center, #000000 0%, #ffffff 100%)" });
  });

  it("image with a trusted URL: veil plus image, sized by fit", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "https://media.voxer.pro");
    expect(voxBackgroundStyle(image, URL_OK)).toEqual({
      backgroundImage: `linear-gradient(color-mix(in srgb, var(--surface-vox-detail) 40%, transparent), color-mix(in srgb, var(--surface-vox-detail) 40%, transparent)), url("${URL_OK}")`,
      backgroundSize: "auto, cover",
      backgroundRepeat: "no-repeat, no-repeat",
      backgroundPosition: "center, center",
    });
    expect(voxBackgroundStyle({ ...image, fit: "tile" }, URL_OK)).toMatchObject({
      backgroundSize: "auto, auto",
      backgroundRepeat: "no-repeat, repeat",
    });
  });

  it.each([
    [image, null],
    [image, "https://evil.example/theme-bg/3f2a1c4e-9b7d-4e21-8a6f-0c1d2e3f4a5b.webp"],
    [image, `${URL_OK}") , url("https://evil.example/x.png`],
    [{ ...image, dimPct: 90 }, URL_OK],
    [{ ...image, fit: "stretch" }, URL_OK],
    [{ ...image, assetId: "../x" }, URL_OK],
    [{ kind: "image", url: URL_OK }, URL_OK],
  ])("imagen inválida o sin URL confiable no aplica estilo: %j", (bg, url) => {
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "https://media.voxer.pro");
    expect(voxBackgroundStyle(bg, url)).toBeUndefined();
  });

  it("none or invalid applies no style", () => {
    expect(voxBackgroundStyle({ kind: "none" })).toBeUndefined();
    expect(voxBackgroundStyle({ kind: "solid", color: "url(x)" })).toBeUndefined();
    expect(voxBackgroundStyle(null)).toBeUndefined();
  });
});
