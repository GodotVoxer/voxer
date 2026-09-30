import { describe, expect, it } from "vitest";
import {
  commentSubmitShortcutTitle,
  shouldSubmitCommentFromKey,
} from "@/features/comments/submitShortcut";

const event = (overrides: Partial<Parameters<typeof shouldSubmitCommentFromKey>[1]> = {}) => ({
  key: "Enter",
  shiftKey: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  isComposing: false,
  ...overrides,
});

describe("shouldSubmitCommentFromKey", () => {
  it("submits only with Shift+Enter by default", () => {
    expect(shouldSubmitCommentFromKey("shift-enter", event({ shiftKey: true }))).toBe(true);
    expect(shouldSubmitCommentFromKey("shift-enter", event())).toBe(false);
  });

  it("submits only with a bare Enter when Enter is chosen", () => {
    expect(shouldSubmitCommentFromKey("enter", event())).toBe(true);
    expect(shouldSubmitCommentFromKey("enter", event({ shiftKey: true }))).toBe(false);
    expect(shouldSubmitCommentFromKey("enter", event({ ctrlKey: true }))).toBe(false);
  });

  it("does not submit while composing or when the shortcut is off", () => {
    expect(shouldSubmitCommentFromKey("enter", event({ isComposing: true }))).toBe(false);
    expect(shouldSubmitCommentFromKey("none", event())).toBe(false);
  });
});

describe("commentSubmitShortcutTitle", () => {
  it("describes the three options", () => {
    expect(commentSubmitShortcutTitle("shift-enter")).toBe("Shift+Enter para publicar");
    expect(commentSubmitShortcutTitle("enter")).toBe("Enter para publicar");
    expect(commentSubmitShortcutTitle("none")).toBe("Sin atajo de teclado para publicar");
  });
});
