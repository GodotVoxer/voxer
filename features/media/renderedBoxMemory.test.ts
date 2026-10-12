import { beforeEach, describe, expect, it } from "vitest";
import {
  forgetRenderedBoxes,
  isMediaSettled,
  recallRenderedBox,
  rememberRenderedBox,
} from "./renderedBoxMemory";

const phone = { width: 412, height: 839 };
const desktop = { width: 1440, height: 900 };

beforeEach(() => forgetRenderedBoxes());

describe("rendered box memory", () => {
  it("recalls the last size remembered for an id", () => {
    rememberRenderedBox("thread:1", phone, { width: 300, height: 180.5 });
    rememberRenderedBox("thread:1", phone, { width: 300, height: 400 });
    expect(recallRenderedBox("thread:1", phone)).toEqual({ width: 300, height: 400 });
    expect(recallRenderedBox("thread:2", phone)).toBeNull();
  });

  it("does not apply a size measured in another viewport", () => {
    rememberRenderedBox("thread:1", phone, { width: 300, height: 400 });
    expect(recallRenderedBox("thread:1", desktop)).toBeNull();
    expect(recallRenderedBox("thread:1", { ...phone, height: 700 })).toBeNull();
  });

  it("keeps the remembered size when the box is measured collapsed", () => {
    rememberRenderedBox("thread:1", phone, { width: 300, height: 400 });
    rememberRenderedBox("thread:1", phone, { width: 300, height: 0 });
    rememberRenderedBox("thread:1", phone, { width: 0, height: 0 });
    expect(recallRenderedBox("thread:1", phone)).toEqual({ width: 300, height: 400 });
  });

  it("forgets the least recently remembered ids past its limit", () => {
    rememberRenderedBox("first", phone, { width: 1, height: 1 });
    rememberRenderedBox("second", phone, { width: 1, height: 1 });
    rememberRenderedBox("first", phone, { width: 2, height: 2 });
    for (let i = 0; i < 1999; i += 1) {
      rememberRenderedBox(`filler:${i}`, phone, { width: 1, height: 1 });
    }
    expect(recallRenderedBox("second", phone)).toBeNull();
    expect(recallRenderedBox("first", phone)).toEqual({ width: 2, height: 2 });
  });
});

type FakeImage = { complete: boolean };
type FakeVideo = { readyState: number; error: unknown };

const root = (images: FakeImage[], videos: FakeVideo[] = []) =>
  ({
    querySelectorAll: (selector: string) => (selector === "img" ? images : videos),
  }) as unknown as Pick<ParentNode, "querySelectorAll">;

describe("isMediaSettled", () => {
  it("is settled without media", () => {
    expect(isMediaSettled(root([]))).toBe(true);
  });

  it("waits for every image", () => {
    expect(isMediaSettled(root([{ complete: true }, { complete: false }]))).toBe(false);
    expect(isMediaSettled(root([{ complete: true }, { complete: true }]))).toBe(true);
  });

  it("waits for the metadata of a video, unless it failed", () => {
    expect(isMediaSettled(root([], [{ readyState: 0, error: null }]))).toBe(false);
    expect(isMediaSettled(root([], [{ readyState: 1, error: null }]))).toBe(true);
    expect(isMediaSettled(root([], [{ readyState: 0, error: { code: 4 } }]))).toBe(true);
  });
});
