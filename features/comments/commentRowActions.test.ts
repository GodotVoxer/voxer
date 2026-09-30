import { describe, expect, it, vi } from "vitest";
import { commentRowActionProps, type CommentRowActions } from "./commentRowActions";
import type { CommentPublic } from "@/lib/vox/types";

const comment = { id: "c1", publicTag: "AAAA1111" } as CommentPublic;

describe("comment row actions", () => {
  it("without permissions enables no staff button and no report", () => {
    const props = commentRowActionProps(
      {
        onReportComment: vi.fn(),
        onModeratorDeleteComment: vi.fn(),
        onModeratorOpenPublicationModComment: vi.fn(),
        moderatorCommentAuthorHistoryHref: () => "/x",
      },
      comment,
    );
    expect(props.onReport).toBeUndefined();
    expect(props.onModeratorDelete).toBeUndefined();
    expect(props.onModeratorPublicationMod).toBeUndefined();
    expect(props.moderatorAuthorHistoryHref).toBeUndefined();
  });

  it("with permissions binds each action to its own comment", () => {
    const onReportComment = vi.fn();
    const onModeratorDeleteComment = vi.fn();
    const actions: CommentRowActions = {
      onReportComment,
      showReportOnComments: true,
      onModeratorDeleteComment,
      showModeratorCommentTools: true,
      moderatorCommentAuthorHistoryHref: (c) => `/h?id=${c.id}`,
    };
    const props = commentRowActionProps(actions, comment);
    props.onReport?.();
    props.onModeratorDelete?.();
    expect(onReportComment).toHaveBeenCalledWith(comment);
    expect(onModeratorDeleteComment).toHaveBeenCalledWith(comment);
    expect(props.moderatorAuthorHistoryHref).toBe("/h?id=c1");
  });

  it("the bell and the pin do not depend on staff permissions", () => {
    const onCommentPinnedChange = vi.fn();
    const onCommentRepliesMutedChange = vi.fn();
    const props = commentRowActionProps(
      { onCommentPinnedChange, onCommentRepliesMutedChange },
      comment,
    );
    expect(props.onPinnedChange).toBe(onCommentPinnedChange);
    expect(props.onRepliesMutedChange).toBe(onCommentRepliesMutedChange);
  });
});
