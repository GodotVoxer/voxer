import { describe, expect, it } from "vitest";
import {
  COMMENT_LINK_FULL_TOKEN_RE,
  COMMENT_LINK_TOKEN_RE,
  internalSitePathFromHref,
  normalizeCommentLinkHref,
} from "@/lib/comments/bodyLinks";

describe("normalizeCommentLinkHref", () => {
  it("adds https to a host with a dot", () => {
    expect(normalizeCommentLinkHref(">google.com")).toBe("https://google.com/");
  });
  it("keeps an explicit scheme", () => {
    expect(normalizeCommentLinkHref(">https://example.org/x")).toBe("https://example.org/x");
  });
  it("rejects javascript:", () => {
    expect(normalizeCommentLinkHref(">javascript:alert(1)")).toBeNull();
  });
  it("rejects data:", () => {
    expect(normalizeCommentLinkHref(">data:text/html,<x")).toBeNull();
  });
  it("rejects text without a leading >", () => {
    expect(normalizeCommentLinkHref("google.com")).toBeNull();
  });
  it("rejects a single-label host (e.g. hide)", () => {
    expect(normalizeCommentLinkHref(">hide")).toBeNull();
  });
  it("rejects localhost", () => {
    expect(normalizeCommentLinkHref(">localhost:3000")).toBeNull();
    expect(normalizeCommentLinkHref(">http://localhost/admin")).toBeNull();
  });
});

describe("COMMENT_LINK_TOKEN_RE", () => {
  it("does not match the second > of >>TAG", () => {
    const s = ">>ABCD1234";
    expect([...s.matchAll(COMMENT_LINK_TOKEN_RE)]).toHaveLength(0);
  });
  it("does not match >>google.com (not an 8-character tag)", () => {
    expect([...">>google.com".matchAll(COMMENT_LINK_TOKEN_RE)]).toHaveLength(0);
  });
  it("matches >domain.tld", () => {
    const m = [...">google.com".matchAll(COMMENT_LINK_TOKEN_RE)];
    expect(m).toHaveLength(1);
    expect(m[0]?.[1]).toBe(">google.com");
  });
  it("split does not duplicate the token", () => {
    expect(">google.com".split(COMMENT_LINK_TOKEN_RE)).toEqual(["", ">google.com", ""]);
  });
  it("full token, not a stray greentext", () => {
    expect(COMMENT_LINK_FULL_TOKEN_RE.test(">hide")).toBe(false);
    expect(COMMENT_LINK_FULL_TOKEN_RE.test(">google.com")).toBe(true);
  });
});

describe("internalSitePathFromHref", () => {
  it("returns the path of a link to the site itself", () => {
    expect(internalSitePathFromHref("https://www.voxer.pro/vox/abc", "www.voxer.pro")).toBe(
      "/vox/abc",
    );
  });
  it("ignores www when comparing hosts", () => {
    expect(internalSitePathFromHref("https://voxer.pro/vox/abc", "www.voxer.pro")).toBe("/vox/abc");
    expect(internalSitePathFromHref("https://www.voxer.pro/NSFW", "voxer.pro")).toBe("/NSFW");
  });
  it("keeps query and anchor", () => {
    expect(
      internalSitePathFromHref("https://www.voxer.pro/vox/abc?denuncia=push#TAG", "www.voxer.pro"),
    ).toBe("/vox/abc?denuncia=push#TAG");
  });
  it("returns null for another site", () => {
    expect(internalSitePathFromHref("https://google.com/vox/abc", "www.voxer.pro")).toBeNull();
    expect(internalSitePathFromHref("https://voxer.pro.evil.com/x", "www.voxer.pro")).toBeNull();
  });
  it("returns null without a current host or with an invalid href", () => {
    expect(internalSitePathFromHref("https://www.voxer.pro/vox/abc", "")).toBeNull();
    expect(internalSitePathFromHref("no-es-url", "www.voxer.pro")).toBeNull();
  });
  it("honours the port in development", () => {
    expect(internalSitePathFromHref("http://localhost:3000/vox/abc", "localhost:3000")).toBe(
      "/vox/abc",
    );
    expect(internalSitePathFromHref("http://localhost:3001/vox/abc", "localhost:3000")).toBeNull();
  });
});
