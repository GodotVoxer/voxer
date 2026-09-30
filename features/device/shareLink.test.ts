import { describe, expect, it, vi } from "vitest";
import { readShareEnv, shareLink, type ShareEnv } from "@/features/device/shareLink";

const link = { path: "/vox/abc", url: "https://www.voxer.pro/vox/abc", title: "Un vox" };

const abortError = () => {
  const e = new Error("cancelado");
  e.name = "AbortError";
  return e;
};

describe("shareLink", () => {
  it("prefers the app's native sheet", async () => {
    const shareNative = vi.fn();
    const webShare = vi.fn().mockResolvedValue(undefined);
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    expect(await shareLink(link, { shareNative, webShare, writeClipboard })).toBe("shared");
    expect(shareNative).toHaveBeenCalledWith("/vox/abc", "Un vox");
    expect(webShare).not.toHaveBeenCalled();
    expect(writeClipboard).not.toHaveBeenCalled();
  });

  it("uses the browser sheet without the app", async () => {
    const webShare = vi.fn().mockResolvedValue(undefined);
    expect(await shareLink(link, { webShare })).toBe("shared");
    expect(webShare).toHaveBeenCalledWith({ title: "Un vox", url: link.url });
  });

  it("cancelling the sheet does not copy to the clipboard", async () => {
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    const env: ShareEnv = { webShare: vi.fn().mockRejectedValue(abortError()), writeClipboard };
    expect(await shareLink(link, env)).toBe("cancelled");
    expect(writeClipboard).not.toHaveBeenCalled();
  });

  it("falls back to the clipboard when the sheet fails for another reason", async () => {
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    const env: ShareEnv = {
      webShare: vi.fn().mockRejectedValue(new Error("no soportado")),
      writeClipboard,
    };
    expect(await shareLink(link, env)).toBe("copied");
    expect(writeClipboard).toHaveBeenCalledWith(link.url);
  });

  it("a broken bridge does not break the rest of the chain", async () => {
    const env: ShareEnv = {
      shareNative: () => {
        throw new Error("puente roto");
      },
      writeClipboard: vi.fn().mockResolvedValue(undefined),
    };
    expect(await shareLink(link, env)).toBe("copied");
  });

  it("fails when no path is available", async () => {
    expect(await shareLink(link, {})).toBe("failed");
    expect(
      await shareLink(link, { writeClipboard: vi.fn().mockRejectedValue(new Error("no")) }),
    ).toBe("failed");
  });
});

describe("readShareEnv", () => {
  it("a bare browser offers no path", () => {
    expect(readShareEnv({})).toEqual({});
    expect(readShareEnv(null)).toEqual({});
  });

  it("picks navigator.share and the clipboard", () => {
    const env = readShareEnv({
      navigator: {
        share: () => Promise.resolve(),
        clipboard: { writeText: () => Promise.resolve() },
      },
    });
    expect(env.webShare).toBeTypeOf("function");
    expect(env.writeClipboard).toBeTypeOf("function");
    expect(env.shareNative).toBeUndefined();
  });

  it("uses the app bridge when it exposes share", () => {
    const share = vi.fn();
    const env = readShareEnv({ VoxerAndroid: { share } });
    env.shareNative?.("/vox/abc", "Un vox");
    expect(share).toHaveBeenCalledWith("/vox/abc", "Un vox");
  });
});
