"use client";

import type { RefObject } from "react";
import { LayoutGrid, X } from "lucide-react";
import { CategoryPanel } from "@/components/Header/CategoryPanel";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

export const CategoriesDrawer = ({ open, onOpenChange, triggerRef }: Props) => (
  <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
    <DrawerContent
      className="app-sidebar flex h-full max-h-[100dvh] w-[min(100vw,320px)] flex-col overflow-hidden bg-surface-raised p-0 text-fg"
      // The button lives outside the drawer root, so focus has to be sent back by hand.
      onCloseAutoFocus={(e) => {
        e.preventDefault();
        triggerRef.current?.focus();
      }}
    >
      <DrawerHeader className="flex-row items-start gap-2.5 border-b border-fg/10 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 text-left">
        <LayoutGrid className="mt-0.5 size-5 shrink-0 text-fg" strokeWidth={2} aria-hidden />
        <div className="min-w-0 flex-1">
          <DrawerTitle className="text-base text-fg">Categorías</DrawerTitle>
          <DrawerDescription className="mt-0.5 text-xs text-fg-subtle">
            Tocá una para entrar. Las casillas eligen qué se ve en el inicio.
          </DrawerDescription>
        </div>
        <DrawerClose
          className="-mt-1 -mr-1 cursor-pointer rounded-md p-1.5 text-fg-muted hover:bg-fg/10 hover:text-fg"
          aria-label="Cerrar"
        >
          <X className="size-5" aria-hidden />
        </DrawerClose>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <CategoryPanel />
      </div>
    </DrawerContent>
  </Drawer>
);
