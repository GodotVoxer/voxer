"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { DrawerClose } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type SidebarNavItemProps = {
  icon: LucideIcon;
  label: string;
  href?: string;
  /** An action instead of navigation (e.g. opening Settings); ignored when `href` is set. */
  onSelect?: () => void;
  disabled?: boolean;
  disabledTitle?: string;
};

const itemClass = "flex w-full items-center gap-3 px-2 py-3 text-sm transition-colors";

export const SidebarNavItem = ({
  icon: Icon,
  label,
  href,
  onSelect,
  disabled = false,
  disabledTitle,
}: SidebarNavItemProps) => {
  const className = cn(
    itemClass,
    disabled
      ? "cursor-not-allowed text-fg-muted opacity-50"
      : "cursor-pointer text-fg hover:bg-fg/10",
  );
  const content = (
    <>
      <Icon className="size-[18px] shrink-0" strokeWidth={2} aria-hidden />
      <span>{label}</span>
    </>
  );

  if (!disabled && !href && onSelect) {
    return (
      <DrawerClose asChild>
        <button type="button" className={className} onClick={onSelect}>
          {content}
        </button>
      </DrawerClose>
    );
  }

  if (disabled || !href) {
    return (
      <span className={className} title={disabledTitle}>
        {content}
      </span>
    );
  }

  return (
    <DrawerClose asChild>
      <Link href={href} className={className}>
        {content}
      </Link>
    </DrawerClose>
  );
};
