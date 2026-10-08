"use client";

import { ArrowUp } from "lucide-react";
import { prefersReducedMotion } from "@/features/device/reducedMotion";
import { useVoxStore } from "@/features/vox/store";
import { Button } from "@/components/ui/button";

export const HomeFeedNewVoxBanner = () => {
  const pendingNewVox = useVoxStore((s) => s.pendingNewVox);
  const prependNewVoxFromServer = useVoxStore((s) => s.prependNewVoxFromServer);
  const clearPendingNewVox = useVoxStore((s) => s.clearPendingNewVox);

  if (!pendingNewVox) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[4.25rem] z-50 flex justify-center px-3">
      <div className="pointer-events-auto">
        <Button
          type="button"
          size="sm"
          className="animate-in fade-in slide-in-from-top-2 cursor-pointer gap-1.5 rounded-full bg-brand-600 pl-3 pr-4 font-semibold text-on-solid shadow-lg ring-1 ring-brand-300/60 hover:bg-brand-500 active:scale-95"
          onClick={() => {
            void prependNewVoxFromServer();
            clearPendingNewVox();
            window.scrollTo({
              top: 0,
              left: 0,
              behavior: prefersReducedMotion() ? "auto" : "smooth",
            });
          }}
        >
          <ArrowUp className="size-4" aria-hidden />
          Ver vox nuevos
        </Button>
      </div>
    </div>
  );
};
