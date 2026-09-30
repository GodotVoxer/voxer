"use client";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { initMocks, isMockDemoMode } from "@/mocks/initMocks";
export const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  // Without MSW there is nothing to wait for: render on the first paint.
  const [ready, setReady] = useState(() => !isMockDemoMode());
  useEffect(() => {
    if (!isMockDemoMode()) return;
    void initMocks().then(() => setReady(true));
  }, []);
  if (!ready) {
    return (
      <div className="min-h-screen bg-surface pt-[var(--app-header-offset)] text-fg">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-6 py-16">
          <Skeleton className="h-9 w-56 rounded-lg bg-fg/10" />
          <Skeleton className="h-4 w-full max-w-xs rounded bg-fg/[0.06]" />
          <Skeleton className="h-4 w-[80%] max-w-xs rounded bg-fg/[0.05]" />
          <p className="text-center text-xs text-fg-subtle">Preparando datos de demostración…</p>
        </div>
      </div>
    );
  }
  return <div className="min-h-screen min-w-0">{children}</div>;
};
