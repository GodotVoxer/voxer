"use client";

import dynamic from "next/dynamic";
import type { RefObject } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  EyeOff,
  Home,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  Star,
  UserRound,
} from "lucide-react";
import { SidebarBrandHeader } from "@/components/Sidebar/SidebarBrandHeader";
import { SidebarNavItem } from "@/components/Sidebar/SidebarNavItem";
import { SidebarPresenceStatus } from "@/components/Sidebar/SidebarPresenceStatus";
import { SidebarSessionStatus } from "@/components/Sidebar/SidebarSessionStatus";
import { SeasonalThemeSidebarItem } from "@/components/Theme/SeasonalThemeSidebarItem";
import { useAuthStore } from "@/features/auth/store";
import { useSettingsStore } from "@/features/settings/store";
import { isStaffRole } from "@/lib/moderation/roles";

const SidebarThemeSection = dynamic(
  () =>
    import("@/components/Theme/SidebarThemeSection").then((module) => module.SidebarThemeSection),
  { ssr: false },
);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

export const SidebarDrawer = ({ open, onOpenChange, triggerRef }: Props) => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <Drawer direction="left" open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="app-sidebar flex h-full max-h-[100dvh] w-[min(100vw,320px)] flex-col overflow-hidden bg-surface-raised p-0 text-fg"
        // The button lives outside the drawer root, so focus has to be sent back by hand.
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <DrawerHeader className="sr-only">
          <DrawerTitle>Voxer</DrawerTitle>
          <DrawerDescription>
            Navegación principal, accesos rápidos, tema y cuenta.
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SidebarBrandHeader />
          <div className="px-4">
            <SidebarPresenceStatus />
            <SeasonalThemeSidebarItem />
            <SidebarSessionStatus />
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
              {user ? (
                <li>
                  <SidebarNavItem
                    icon={LogOut}
                    label="Cerrar sesión"
                    onSelect={() => void logout()}
                  />
                </li>
              ) : null}
            </ul>
            {open ? <SidebarThemeSection /> : null}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
