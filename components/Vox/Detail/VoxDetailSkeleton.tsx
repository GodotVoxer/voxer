"use client";
import { Skeleton } from "@/components/ui/skeleton";
import { VoxDetailBackdrop } from "@/components/Vox/Detail/VoxDetailBackdrop";

export const VoxDetailSkeleton = () => {
  return (
    <main className="isolate mt-[var(--app-header-offset)] min-h-[calc(100dvh-var(--app-header-offset))] bg-surface-vox-detail text-fg">
      <VoxDetailBackdrop />
      <div className="flex w-full min-w-0 flex-col lg:flex-row lg:items-start">
        <div className="space-y-4 p-4 lg:min-w-0 lg:w-1/2 lg:shrink-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28 rounded bg-fg/10" />
            <Skeleton className="ml-auto h-3 w-10 rounded bg-fg/[0.08]" />
          </div>
          <Skeleton className="aspect-video w-full rounded-lg bg-fg/[0.08]" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-full max-w-md rounded-md bg-fg/10" />
            <Skeleton className="h-3 w-full rounded bg-fg/[0.06]" />
            <Skeleton className="h-3 w-full rounded bg-fg/[0.06]" />
            <Skeleton className="h-3 w-[70%] rounded bg-fg/[0.06]" />
          </div>
        </div>
        <section className="flex min-h-[55vh] flex-1 flex-col border-t border-fg/10 lg:min-h-[calc(100dvh-var(--app-header-offset))] lg:self-stretch lg:border-l lg:border-t-0">
          <div className="shrink-0 space-y-2 border-b border-fg/10 bg-surface-sunken/90 p-3">
            <Skeleton className="h-3 w-28 rounded bg-fg/10" />
            <Skeleton className="h-[88px] w-full rounded-md bg-fg/[0.07]" />
            <div className="flex gap-2">
              <Skeleton className="size-9 rounded-md bg-fg/10" />
              <Skeleton className="h-9 w-24 rounded-md bg-fg/10" />
            </div>
          </div>
          <div className="flex-1 space-y-3 p-3">
            <Skeleton className="h-4 w-32 rounded bg-fg/10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-lg border border-fg/5 bg-surface-raised/40 p-3"
              >
                <Skeleton className="size-10 shrink-0 rounded-full bg-fg/10" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-24 rounded bg-fg/10" />
                  <Skeleton className="h-3 w-full rounded bg-fg/[0.06]" />
                  <Skeleton className="h-3 w-[85%] rounded bg-fg/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};
