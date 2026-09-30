import { describe, expect, it } from "vitest";
import {
  appendReplyTagToDraft,
  extractDistinctReplyTagsInOrder,
  isDraftOnlyReplyTags,
  replyTagsErrorMessageEs,
  validateCommentReplyTagCountOnly,
  validateCommentReplyTags,
} from "./replies";
import { COMMENT_REPLY_TAGS_MAX } from "@/lib/limits";
describe("extractDistinctReplyTagsInOrder", () => {
  it("extracts unique tags in order of appearance", () => {
    expect(extractDistinctReplyTagsInOrder(">>ABCD1234 hola >>EFGH5678")).toEqual([
      "ABCD1234",
      "EFGH5678",
    ]);
  });
  it("deduplicates the same tag", () => {
    expect(extractDistinctReplyTagsInOrder(">>ZZZZ9999 >>ZZZZ9999 fin")).toEqual(["ZZZZ9999"]);
  });
  it("ignores text that is not 8 alphanumerics", () => {
    expect(extractDistinctReplyTagsInOrder(">>CORTO >>12345678")).toEqual(["12345678"]);
  });
});
const tagsUpperSet = (rows: readonly { publicTag: string }[]): Set<string> =>
  new Set(rows.map((c) => c.publicTag.toUpperCase()));

describe("validateCommentReplyTagCountOnly", () => {
  it("rejects more than N distinct tags", () => {
    const n = COMMENT_REPLY_TAGS_MAX + 1;
    const tags = Array.from({ length: n }, (_, i) => String(i + 1).padStart(8, "0"));
    const r = validateCommentReplyTagCountOnly(tags.map((t) => `>>${t}`).join(" "));
    expect(r?.kind).toBe("too_many");
  });
});

describe("validateCommentReplyTags", () => {
  const base = [
    { publicTag: "TGTGTGTG", body: "root" },
    { publicTag: "SRCSRCSR", body: ">>TGTGTGTG primera respuesta" },
  ];
  const baseUpper = tagsUpperSet(base);
  it("accepts a valid tag not used yet", () => {
    expect(
      validateCommentReplyTags({
        newBody: ">>SRCSRCSR ok",
        existingPublicTagsUpper: baseUpper,
      }),
    ).toBeNull();
  });
  it("rejects a tag that does not exist", () => {
    const r = validateCommentReplyTags({
      newBody: ">>NOTNOTNO",
      existingPublicTagsUpper: baseUpper,
    });
    expect(r?.kind).toBe("unknown_target");
  });
  it("allows another reply to the same quoted comment", () => {
    expect(
      validateCommentReplyTags({
        newBody: ">>TGTGTGTG segunda respuesta",
        existingPublicTagsUpper: baseUpper,
      }),
    ).toBeNull();
  });
  it("rejects more than N distinct tags", () => {
    const n = COMMENT_REPLY_TAGS_MAX + 1;
    const tags = Array.from({ length: n }, (_, i) => String(i + 1).padStart(8, "0"));
    const existingUpper = tagsUpperSet(tags.map((publicTag) => ({ publicTag })));
    const r = validateCommentReplyTags({
      newBody: tags.map((t) => `>>${t}`).join(" "),
      existingPublicTagsUpper: existingUpper,
    });
    expect(r?.kind).toBe("too_many");
  });
});
describe("isDraftOnlyReplyTags", () => {
  it("detects an empty draft or one with only tags", () => {
    expect(isDraftOnlyReplyTags("")).toBe(true);
    expect(isDraftOnlyReplyTags("  \n")).toBe(true);
    expect(isDraftOnlyReplyTags(">>ABCD1234")).toBe(true);
    expect(isDraftOnlyReplyTags(">>ABCD1234\n>>EFGH5678")).toBe(true);
    expect(isDraftOnlyReplyTags(">>ABCD1234 hola")).toBe(false);
  });
});
describe("appendReplyTagToDraft", () => {
  it("accumulates tags without dropping the previous one", () => {
    expect(appendReplyTagToDraft(">>AAAAAAAA", "BBBBBBBB")).toBe(">>AAAAAAAA\n>>BBBBBBBB\n");
  });
  it("adds the new tag on its own line in a draft with text", () => {
    expect(appendReplyTagToDraft("hola", "AAAAAAAA")).toBe("hola\n>>AAAAAAAA\n");
    expect(appendReplyTagToDraft("hola\n", "AAAAAAAA")).toBe("hola\n>>AAAAAAAA\n");
    expect(appendReplyTagToDraft("hola\n>>AAAAAAAA", "BBBBBBBB")).toBe(
      "hola\n>>AAAAAAAA\n>>BBBBBBBB\n",
    );
  });
  it("neither duplicates nor exceeds the maximum", () => {
    const four = ">>11111111 >>22222222 >>33333333 >>44444444";
    expect(appendReplyTagToDraft(four, "11111111")).toBe(four);
    const five = `${four} >>55555555`;
    expect(appendReplyTagToDraft(five, "66666666")).toBe(five);
  });
});
describe("replyTagsErrorMessageEs", () => {
  it("names the tag when the target does not exist", () => {
    const m = replyTagsErrorMessageEs({ kind: "unknown_target", tag: "ABAB1212" });
    expect(m).toContain("ABAB1212");
  });
});
