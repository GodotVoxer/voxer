"use client";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { internalSitePathFromHref } from "@/lib/comments/bodyLinks";
import { navigateToPushPath } from "@/features/push/navigateToPushPath";

type Props = {
  href: string;
  className?: string;
  children: ReactNode;
};

/** Link written in a comment. Links to this site navigate with the router: in the Android WebView a `target="_blank"` to another vox opened nothing. */
export const CommentTextLink = ({ href, className, children }: Props) => {
  const router = useRouter();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const path = internalSitePathFromHref(href, window.location.host);
        if (!path) return;
        e.preventDefault();
        navigateToPushPath(path, router.push);
      }}
    >
      {children}
    </a>
  );
};
