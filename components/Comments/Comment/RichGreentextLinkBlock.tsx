"use client";
import { Fragment, type ReactElement } from "react";
import {
  COMMENT_LINK_FULL_TOKEN_RE,
  COMMENT_LINK_TOKEN_RE,
  normalizeCommentLinkHref,
} from "@/lib/comments/bodyLinks";
import { isGreentextLine } from "@/features/comments/greentext";
import { CommentTextLink } from "@/components/Comments/Comment/CommentTextLink";

export const linkStyleAnchorClass =
  "cursor-pointer font-medium text-brand-400 hover:text-brand-300 hover:underline";

export const renderLinkTextBits = (
  part: string,
  tagsAsPlainText: boolean,
  keyPrefix: string,
): ReactElement[] => {
  const linkBits = part.split(COMMENT_LINK_TOKEN_RE);
  return linkBits.map((bit, j) => {
    const key = `${keyPrefix}-${j}`;
    if (!COMMENT_LINK_FULL_TOKEN_RE.test(bit)) {
      return <Fragment key={key}>{bit}</Fragment>;
    }
    const href = normalizeCommentLinkHref(bit);
    if (href) {
      if (tagsAsPlainText) {
        return (
          <span key={key} className="font-medium text-brand-400/90">
            {bit}
          </span>
        );
      }
      return (
        <CommentTextLink key={key} href={href} className={linkStyleAnchorClass}>
          {bit}
        </CommentTextLink>
      );
    }
    return <Fragment key={key}>{bit}</Fragment>;
  });
};

type Props = {
  text: string;
  className?: string;
  tagsAsPlainText?: boolean;
};

export const RichGreentextLinkBlock = ({ text, className, tagsAsPlainText = false }: Props) => {
  const lines = text.split("\n");
  return (
    <p className={className}>
      {lines.map((line, li) => {
        const green = isGreentextLine(line);
        const inner = renderLinkTextBits(line, tagsAsPlainText, `ln${li}`);
        return (
          <Fragment key={li}>
            {li > 0 ? <br /> : null}
            <span className={green ? "text-greentext" : undefined}>{inner}</span>
          </Fragment>
        );
      })}
    </p>
  );
};
