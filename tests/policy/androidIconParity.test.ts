import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The Android app icon reproduces the web favicon. They are separate files, so this fails when one
 * changes without the other. The favicon is the source of truth: after redesigning it, update
 * `android/app/src/main/res` and this test points at what is out of sync.
 */
const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const favicon = read("app/icon.svg");
const colors = read("android/app/src/main/res/values/colors.xml");
const launcher = read("android/app/src/main/res/drawable/ic_launcher_foreground.xml");
const splash = read("android/app/src/main/res/drawable/ic_voxer_splash.xml");

type Point = readonly [number, number];

/** Each `M … Z` subpath of the outline as a list of vertices. */
const subpaths = (path: string): Point[][] =>
  path
    .split(/(?=M)/)
    .map((sub) =>
      [...sub.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(
        (m) => [Number(m[1]), Number(m[2])] as Point,
      ),
    )
    .filter((pts) => pts.length >= 3);

const points = (path: string): Point[] => subpaths(path).flat();

/** Area centroid of the polygons, which is the optical center of the mark. */
const centroid = (path: string): Point => {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (const poly of subpaths(path)) {
    for (let i = 0; i < poly.length; i += 1) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      const cross = x1 * y2 - x2 * y1;
      a += cross;
      cx += (x1 + x2) * cross;
      cy += (y1 + y2) * cross;
    }
  }
  return [cx / (3 * a), cy / (3 * a)];
};

const faviconBackground = /<rect[^>]*fill="(#[0-9a-fA-F]{6})"/.exec(favicon)?.[1]?.toLowerCase();
const faviconMark = /<path[^>]*fill="(#[0-9a-fA-F]{6})"/.exec(favicon)?.[1]?.toLowerCase();
const faviconPath = /<path[^>]*\sd="([^"]+)"/.exec(favicon)?.[1] ?? "";
const launcherPath = /android:pathData="([^"]+)"/.exec(launcher)?.[1] ?? "";

const colorXml = (name: string) =>
  new RegExp(`name="${name}">(#[0-9a-fA-F]{6})<`).exec(colors)?.[1]?.toLowerCase();

describe("web favicon and Android icon parity", () => {
  it("the favicon declares a background and a mark", () => {
    expect(faviconBackground).toMatch(/^#[0-9a-f]{6}$/);
    expect(faviconMark).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("the adaptive icon background is the favicon's", () => {
    expect(colorXml("voxer_icon_background")).toBe(faviconBackground);
  });

  it("the declared mark color is the favicon's", () => {
    expect(colorXml("voxer_icon_mark")).toBe(faviconMark);
  });

  it("launcher and splash paint with that color", () => {
    expect(launcher).toContain('android:fillColor="@color/voxer_icon_mark"');
    expect(splash).toContain('android:fillColor="@color/voxer_icon_mark"');
  });

  it("the splash uses exactly the launcher outline", () => {
    expect(/android:pathData="([^"]+)"/.exec(splash)?.[1]).toBe(launcherPath);
  });

  it("the launcher draws the same shape as the favicon", () => {
    // Each target picks its own size and position, but the drawing must be the same: one uniform
    // scale plus an offset, without distorting or reordering vertices.
    const fav = points(faviconPath);
    const lan = points(launcherPath);
    expect(fav.length).toBeGreaterThan(0);
    expect(lan).toHaveLength(fav.length);
    expect(faviconPath.replace(/[\d.,-]+/g, "")).toBe(launcherPath.replace(/[\d.,-]+/g, ""));

    const width = (pts: Point[]) =>
      Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
    const scale = width(lan) / width(fav);
    const dx = lan[0][0] - fav[0][0] * scale;
    const dy = lan[0][1] - fav[0][1] * scale;
    for (const [i, [x, y]] of fav.entries()) {
      expect(lan[i][0]).toBeCloseTo(x * scale + dx, 1);
      expect(lan[i][1]).toBeCloseTo(y * scale + dy, 1);
    }
  });

  it("the launcher mark is optically centered", () => {
    // By its bounding box the mark sits high, since most of its mass is at the top; what counts is
    // the area centroid, at the center of the 108 dp canvas.
    const [cx, cy] = centroid(launcherPath);
    expect(cx).toBeCloseTo(54, 0);
    expect(cy).toBeCloseTo(54, 0);
  });

  it("the launcher mark stays clear of the launcher mask", () => {
    // Launchers crop freely inside 108 dp and only guarantee the centered 72 dp circle (radius 36).
    // 32 matches the mark's proportion in the original logo and still leaves an 11% margin.
    const radius = Math.max(...points(launcherPath).map(([x, y]) => Math.hypot(x - 54, y - 54)));
    expect(radius).toBeLessThanOrEqual(32);
    expect(radius).toBeGreaterThanOrEqual(28);
  });
});
