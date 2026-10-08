"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { CategoriesMenuButton } from "@/components/Header/CategoriesMenuButton";
import { useIdleReady } from "@/hooks/common/useIdleReady";

const HeaderCategoriesDropdown = dynamic(
  () =>
    import("@/components/Header/HeaderCategoriesDropdown").then((m) => m.HeaderCategoriesDropdown),
  { ssr: false, loading: () => <CategoriesMenuButton disabled /> },
);

/** The menu needs its button inside it, so an identical one stands in until the menu code loads. */
export const HeaderCategoriesMenu = () => {
  const idle = useIdleReady();
  const [requested, setRequested] = useState(false);
  if (idle || requested) return <HeaderCategoriesDropdown defaultOpen={requested} />;
  return <CategoriesMenuButton onClick={() => setRequested(true)} />;
};
