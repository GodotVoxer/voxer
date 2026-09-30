"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { EyeOff, Home, Menu, MessageSquare, Settings, Shield, Star, UserRound } from "lucide-react";
import { CategoryPanel } from "@/components/Header/CategoryPanel";
import { SidebarBrandHeader } from "@/components/Sidebar/SidebarBrandHeader";
import { SidebarNavItem } from "@/components/Sidebar/SidebarNavItem";
import { SidebarPresenceStatus } from "@/components/Sidebar/SidebarPresenceStatus";
import { useAuthStore } from "@/features/auth/store";
import { useSettingsStore } from "@/features/settings/store";
import { isStaffRole } from "@/lib/moderation/roles";

const SidebarThemeSection = dynamic(
  () =>
    import("@/components/Theme/SidebarThemeSection").then((module) => module.SidebarThemeSection),
  { ssr: false },
);

export const Sidebar = () => {
  const user = useAuthStore((s) => s.user);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <Drawer direction="left" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="app-header-control mr-1 cursor-pointer rounded-md border border-surface-strong bg-surface-raised text-brand-100 hover:border-brand-600/70 hover:bg-surface-elevated hover:text-fg"
        >
          <Menu className="h-5 w-5 shrink-0" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="app-sidebar flex h-full max-h-[100dvh] w-[min(100vw,320px)] flex-col overflow-hidden bg-surface-raised p-0 text-fg">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Voxer</DrawerTitle>
          <DrawerDescription>
            Navegación principal, accesos rápidos y filtro por categorías.
          </DrawerDescription>
        </DrawerHeader>
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SidebarBrandHeader />
          <div className="px-4">
            <SidebarPresenceStatus />
            <ul className="divide-y divide-fg/10">
              <li>
                <SidebarNavItem icon={Home} label="Inicio" href="/" />
              </li>
              <li>
                <SidebarNavItem
                  icon={Star}
                  label="Favoritos"
                  href={user ? "/favoritos" : undefined}
                  disabled={!user}
                  disabledTitle="Iniciá sesión para ver favoritos"
                />
              </li>
              <li>
                <SidebarNavItem
                  icon={EyeOff}
                  label="Ocultos"
                  href={user ? "/ocultos" : undefined}
                  disabled={!user}
                  disabledTitle="Iniciá sesión para ver ocultos"
                />
              </li>
              <li>
                <SidebarNavItem
                  icon={UserRound}
                  label="Creados"
                  href={user ? "/creados" : undefined}
                  disabled={!user}
                  disabledTitle="Iniciá sesión para ver tus vox creados"
                />
              </li>
              <li>
                <SidebarNavItem
                  icon={MessageSquare}
                  label="Comentarios"
                  href={user ? "/comentarios" : undefined}
                  disabled={!user}
                  disabledTitle="Iniciá sesión para ver tus comentarios"
                />
              </li>
              {user && isStaffRole(user.role) ? (
                <li>
                  <SidebarNavItem icon={Shield} label="Moderación" href="/moderacion" />
                </li>
              ) : null}
            </ul>
            <ul className="divide-y divide-fg/10 border-t border-fg/10">
              <li>
                <SidebarNavItem
                  icon={Settings}
                  label="Configuración"
                  onSelect={() => useSettingsStore.getState().setDialogOpen(true)}
                />
              </li>
            </ul>
            {open ? <SidebarThemeSection /> : null}
            <CategoryPanel scrollContainerRef={scrollRef} />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
