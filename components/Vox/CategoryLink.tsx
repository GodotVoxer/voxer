"use client";
import Link from "next/link";
import * as React from "react";
import { getCategoryCode } from "@/lib/vox/categoryCodes";
import { cn } from "@/lib/utils";

type Props = {
  category: string;
  className?: string;
  /** When omitted, shows the short code (e.g. GEN) with the full name as tooltip. */
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<typeof Link>, "href" | "children">;

export const CategoryLink = React.forwardRef<HTMLAnchorElement, Props>(
  ({ category, className, children, onClick, ...rest }, ref) => {
    const code = getCategoryCode(category);
    const label = children ?? code ?? category;
    if (!code) {
      return (
        <span className={className} title={category}>
          {label}
        </span>
      );
    }
    return (
      <Link
        ref={ref}
        {...rest}
        href={`/${code}`}
        className={cn("cursor-pointer hover:underline", className)}
        title={category}
        onClick={(e) => {
          onClick?.(e);
          e.stopPropagation();
        }}
      >
        {label}
      </Link>
    );
  },
);
CategoryLink.displayName = "CategoryLink";
