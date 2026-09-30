import { readAndroidShareBridge } from "@/features/native/androidBridge";

export type ShareOutcome = "shared" | "cancelled" | "copied" | "failed";

export type ShareEnv = {
  /** Android's native sheet: the WebView does not implement `navigator.share`, so the bridge is needed. */
  shareNative?: (path: string, title: string) => void;
  webShare?: (data: { title: string; url: string }) => Promise<void>;
  writeClipboard?: (text: string) => Promise<void>;
};

const isAbort = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { name?: unknown }).name === "AbortError";

/**
 * Attempts from best to always available: the app's native sheet, the browser sheet, the clipboard.
 * Cancelling a sheet is the user's decision, not an error, so it does not fall back to copying.
 */
export const shareLink = async (
  link: { path: string; url: string; title: string },
  env: ShareEnv,
): Promise<ShareOutcome> => {
  if (env.shareNative) {
    try {
      env.shareNative(link.path, link.title);
      return "shared";
    } catch {
      // Broken bridge: the web paths remain.
    }
  }
  if (env.webShare) {
    try {
      await env.webShare({ title: link.title, url: link.url });
      return "shared";
    } catch (error) {
      if (isAbort(error)) return "cancelled";
    }
  }
  if (env.writeClipboard) {
    try {
      await env.writeClipboard(link.url);
      return "copied";
    } catch {
      return "failed";
    }
  }
  return "failed";
};

type ShareWindow = {
  navigator?: {
    share?: unknown;
    clipboard?: { writeText?: unknown };
  };
  document?: Document;
};

/** Not every WebView has `navigator.clipboard`; the deprecated textarea + `execCommand` still works there. */
const legacyCopy = (doc: Document, text: string): boolean => {
  const area = doc.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.opacity = "0";
  doc.body.appendChild(area);
  area.select();
  try {
    return doc.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
};

export const readShareEnv = (win: unknown): ShareEnv => {
  const env: ShareEnv = {};
  if (typeof win !== "object" || win === null) return env;
  const bridge = readAndroidShareBridge(win);
  if (bridge) env.shareNative = (path, title) => bridge.share(path, title);

  const nav = (win as ShareWindow).navigator;
  if (typeof nav?.share === "function") {
    const share = nav.share as (data: { title: string; url: string }) => Promise<void>;
    env.webShare = (data) => share.call(nav, data);
  }
  const clipboard = nav?.clipboard;
  if (clipboard && typeof clipboard.writeText === "function") {
    const write = clipboard.writeText as (text: string) => Promise<void>;
    env.writeClipboard = (text) => write.call(clipboard, text);
  } else {
    const doc = (win as ShareWindow).document;
    if (doc) {
      env.writeClipboard = async (text) => {
        if (!legacyCopy(doc, text)) throw new Error("copy failed");
      };
    }
  }
  return env;
};
