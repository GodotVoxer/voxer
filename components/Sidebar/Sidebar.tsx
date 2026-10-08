"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIdleReady } from "@/hooks/common/useIdleReady";
import { useOpenedOnce } from "@/hooks/common/useOpenedOnce";

// The drawer (vaul and the category panel) loads once the page is idle, not before the first paint.
const SidebarDrawer = dynamic(
  () => import("@/components/Sidebar/SidebarDrawer").then((m) => m.SidebarDrawer),
  { ssr: false },
);

export const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const idle = useIdleReady();
  const opened = useOpenedOnce(open);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        aria-label="Abrir menú"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="app-header-control mr-1 cursor-pointer rounded-md border border-surface-strong bg-surface-raised text-brand-100 hover:border-brand-600/70 hover:bg-surface-elevated hover:text-fg"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5 shrink-0" />
      </Button>
      {idle || opened ? (
        <SidebarDrawer open={open} onOpenChange={setOpen} triggerRef={triggerRef} />
      ) : null}
    </>
  );
};
