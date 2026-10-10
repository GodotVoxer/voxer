import { describe, expect, it } from "vitest";
import {
  appendHideCommandToBody,
  commentBodyHasHideCommand,
  HIDE_COMMAND,
} from "@/lib/comments/hideCommand";

describe("commentBodyHasHideCommand", () => {
  it("matches a body that is only the command", () => {
    expect(commentBodyHasHideCommand(">hide")).toBe(true);
  });

  it("matches the command on its own line among others", () => {
    expect(commentBodyHasHideCommand("malísimo\n>hide")).toBe(true);
    expect(commentBodyHasHideCommand(">hide\r\n>>ABCD1234 chau")).toBe(true);
  });

  it("ignores case and surrounding spaces", () => {
    expect(commentBodyHasHideCommand("  >HIDE  ")).toBe(true);
  });

  it("does not match the command inside a longer line", () => {
    expect(commentBodyHasHideCommand("le tiro >hide a esto")).toBe(false);
    expect(commentBodyHasHideCommand(">hide y me voy")).toBe(false);
    expect(commentBodyHasHideCommand(">hidea")).toBe(false);
    expect(commentBodyHasHideCommand(">>hide")).toBe(false);
  });

  it("does not match an empty body", () => {
    expect(commentBodyHasHideCommand("")).toBe(false);
  });
});

describe("appendHideCommandToBody", () => {
  it("adds the command on a new line", () => {
    expect(appendHideCommandToBody("malísimo")).toBe(`malísimo\n${HIDE_COMMAND}`);
  });

  it("drops trailing whitespace before the new line", () => {
    expect(appendHideCommandToBody("malísimo \n\n")).toBe(`malísimo\n${HIDE_COMMAND}`);
  });

  it("returns only the command for an empty body", () => {
    expect(appendHideCommandToBody("   ")).toBe(HIDE_COMMAND);
  });

  it("leaves a body that already carries the command untouched", () => {
    expect(appendHideCommandToBody(">hide\nchau")).toBe(">hide\nchau");
  });
});
