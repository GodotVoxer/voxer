"use client";

import Image from "next/image";
import Link from "next/link";
import { DrawerClose } from "@/components/ui/drawer";
import {
  SIDEBAR_BRAND_LOGO_BOX_HEIGHT,
  SIDEBAR_BRAND_LOGO_SAFE_OBJECT_POSITION,
  SIDEBAR_BRAND_LOGO_URL,
} from "@/features/theme/sidebarBrandLogoCrop";

export const SidebarBrandHeader = () => {
  return (
    <DrawerClose asChild>
      <Link
        href="/"
        className="relative mb-2 block w-full shrink-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-inset"
        aria-label="Voxer — ir al inicio"
      >
        <div
          className="relative w-full overflow-hidden"
          style={{ height: SIDEBAR_BRAND_LOGO_BOX_HEIGHT }}
        >
          {/* Picked by CSS (the `dark` class on <html>), independent of hydration; the hidden image is not downloaded. */}
          <Image
            src={SIDEBAR_BRAND_LOGO_URL.dark}
            alt=""
            fill
            className="hidden object-cover dark:block"
            style={{ objectPosition: SIDEBAR_BRAND_LOGO_SAFE_OBJECT_POSITION }}
            sizes="320px"
          />
          <Image
            src={SIDEBAR_BRAND_LOGO_URL.light}
            alt=""
            fill
            className="block object-cover dark:hidden"
            style={{ objectPosition: SIDEBAR_BRAND_LOGO_SAFE_OBJECT_POSITION }}
            sizes="320px"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface-raised via-surface-raised/70 to-transparent"
            aria-hidden
          />
        </div>
      </Link>
    </DrawerClose>
  );
};
