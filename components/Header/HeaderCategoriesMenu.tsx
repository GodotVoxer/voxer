"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { CategoriesMenuButton } from "@/components/Header/CategoriesMenuButton";
import { useIdleReady } from "@/hooks/common/useIdleReady";
import { useOpenedOnce } from "@/hooks/common/useOpenedOnce";
import { useIsDesktop } from "@/hooks/device/useIsDesktop";

const HeaderCategoriesDropdown = dynamic(
  () =>
    import("@/components/Header/HeaderCategoriesDropdown").then((m) => m.HeaderCategoriesDropdown),
  { ssr: false, loading: () => <CategoriesMenuButton disabled /> },
);

const CategoriesDrawer = dynamic(
  () => import("@/components/Header/CategoriesDrawer").then((m) => m.CategoriesDrawer),
  { ssr: false },
);

/** The menu needs its button inside it, so an identical one stands in until the menu code loads. */
const DesktopCategoriesMenu = () => {
  const idle = useIdleReady();
  const [requested, setRequested] = useState(false);
  if (idle || requested) return <HeaderCategoriesDropdown defaultOpen={requested} />;
  return <CategoriesMenuButton onClick={() => setRequested(true)} />;
};

const MobileCategoriesMenu = () => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const idle = useIdleReady();
  const opened = useOpenedOnce(open);
  return (
    <>
      <CategoriesMenuButton
        ref={triggerRef}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      />
      {idle || opened ? (
        <CategoriesDrawer open={open} onOpenChange={setOpen} triggerRef={triggerRef} />
      ) : null}
    </>
  );
};

/** Categories are the most used shortcut, so they live in the header on every screen size. */
export const HeaderCategoriesMenu = () =>
  useIsDesktop() ? <DesktopCategoriesMenu /> : <MobileCategoriesMenu />;
