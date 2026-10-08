"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIdleReady } from "@/hooks/common/useIdleReady";
import { useOpenedOnce } from "@/hooks/common/useOpenedOnce";

const SearchVoxDialogContent = dynamic(
  () => import("./SearchVoxDialogContent").then((m) => m.SearchVoxDialogContent),
  { ssr: false },
);

export const SearchVoxDialog = () => {
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const idle = useIdleReady();
  const opened = useOpenedOnce(open);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setOpenCount((n) => n + 1);
    setOpen(nextOpen);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="app-header-control shrink-0 text-fg-secondary hover:bg-fg/10 hover:text-fg"
        aria-label="Buscar vox por título"
        aria-haspopup="dialog"
        onClick={() => handleOpenChange(true)}
      >
        <Search className="size-5" />
      </Button>
      {idle || opened ? (
        <SearchVoxDialogContent open={open} openCount={openCount} onOpenChange={handleOpenChange} />
      ) : null}
    </>
  );
};
