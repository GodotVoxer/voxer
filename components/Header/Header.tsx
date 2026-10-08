"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { MobileAccountMenu } from "./MobileAccountMenu";
import { HeaderCategoriesMenu } from "./HeaderCategoriesMenu";
import { AuthBootstrap } from "@/components/Auth/AuthBootstrap";
import { UserRealtimeBridge } from "@/components/Auth/UserRealtimeBridge";
import { NativeAppBridge } from "@/components/Native/NativeAppBridge";
import { HomeFeedRealtimeBridge } from "@/components/Vox/Grid/HomeFeedRealtimeBridge";
import { GlobalPresenceBridge } from "@/components/Header/GlobalPresenceBridge";
import { NotificationsBell } from "@/components/Notifications/NotificationsBell";
import { WebPushBridge } from "@/components/Notifications/WebPushBridge";
import { SearchVoxDialog } from "./SearchVoxDialog";
import { ThemeAccountSync } from "@/components/Theme/ThemeAccountSync";
import { ThemeApplier } from "@/components/Theme/ThemeApplier";
import { NotificationSoundPlayer } from "@/components/Notifications/NotificationSoundPlayer";
import { DocumentTitleUnreadCount } from "@/components/Notifications/DocumentTitleUnreadCount";
import { SettingsDialogHost } from "@/components/Settings/SettingsDialogHost";
import { MediaViewerHost } from "@/components/Media/MediaViewerHost";
import { ThemeEditorHost } from "@/components/Theme/ThemeEditorHost";
import { ThemeSafeModeBanner } from "@/components/Theme/ThemeSafeModeBanner";
import { useAuthStore } from "@/features/auth/store";
import { useRulesPromptStore } from "@/features/auth/rulesPromptStore";
import { useIdleReady } from "@/hooks/common/useIdleReady";
import { isStaffRole } from "@/lib/moderation/roles";
import { useFullscreenScrollRestore } from "@/hooks/device/useFullscreenScrollRestore";
import { CreateVoxTriggerButton } from "@/components/Vox/CreateVoxTriggerButton";
import { cn } from "@/lib/utils";
// Closed until someone signs in or must accept the rules: mounted once the page is idle.
const AuthDialog = dynamic(() => import("@/components/Auth/AuthDialog").then((m) => m.AuthDialog), {
  ssr: false,
});
const CommunityRulesDialog = dynamic(
  () => import("@/components/Auth/CommunityRulesDialog").then((m) => m.CommunityRulesDialog),
  { ssr: false },
);
// Staff only: other visitors never download it.
const ModerationReportsBell = dynamic(
  () =>
    import("@/components/Moderation/Reports/ModerationReportsBell").then(
      (m) => m.ModerationReportsBell,
    ),
  { ssr: false },
);
const CreateVoxDialog = dynamic(
  () => import("@/components/Vox/CreateVoxDialog").then((m) => m.CreateVoxDialog),
  { ssr: false, loading: () => <CreateVoxTriggerButton disabled /> },
);

export const Header = () => {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const openAuthDialog = useAuthStore((s) => s.openAuthDialog);
  const authDialogOpen = useAuthStore((s) => s.authDialogOpen);
  const rulesPromptOpen = useRulesPromptStore((s) => s.reason !== null);
  const idle = useIdleReady();
  const logout = useAuthStore((s) => s.logout);
  useFullscreenScrollRestore();
  return (
    <>
      <ThemeApplier />
      <ThemeAccountSync />
      <ThemeEditorHost />
      <SettingsDialogHost />
      <MediaViewerHost />
      <NotificationSoundPlayer />
      <DocumentTitleUnreadCount />
      <ThemeSafeModeBanner />
      <AuthBootstrap />
      <NativeAppBridge />
      <WebPushBridge />
      <UserRealtimeBridge />
      <HomeFeedRealtimeBridge />
      <GlobalPresenceBridge />
      {idle || authDialogOpen ? <AuthDialog /> : null}
      {idle || rulesPromptOpen ? <CommunityRulesDialog /> : null}
      <header className="app-header fixed top-0 right-0 left-0 z-40 pt-[env(safe-area-inset-top,0px)]">
        <div className="flex h-11 items-center gap-2 px-3 text-fg sm:gap-2 sm:px-4">
          <Sidebar />
          <Link
            href="/"
            className="app-header-brand cursor-pointer text-2xl font-bold leading-none tracking-tight text-fg uppercase transition-opacity hover:opacity-90"
            onClick={(e) => {
              if (pathname !== "/") return;
              e.preventDefault();
              window.scrollTo({ top: 0, left: 0, behavior: "auto" });
            }}
          >
            VOXER
          </Link>
          <span className="flex-1 min-w-2" />
          <SearchVoxDialog />
          {/* Hidden instead of absent while the session loads, so the header does not shift for visitors. */}
          {!user && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "app-header-control cursor-pointer shrink-0 border-fg/25 bg-surface-raised text-fg hover:bg-fg/10",
                loading && "invisible",
              )}
              onClick={() => openAuthDialog()}
            >
              Entrar
            </Button>
          )}
          {/* On desktop the header is the only place to jump to a category without opening the sidebar. */}
          <HeaderCategoriesMenu />
          {user && (
            <div className="app-header-session contents">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="hidden cursor-pointer text-fg-muted hover:bg-fg/10 hover:text-fg sm:inline-flex"
                onClick={() => void logout()}
              >
                Salir
              </Button>
            </div>
          )}
          {user ? <MobileAccountMenu /> : null}
          {user && isStaffRole(user.role) ? <ModerationReportsBell /> : null}
          <NotificationsBell />
          <CreateVoxDialog />
        </div>
      </header>
    </>
  );
};
