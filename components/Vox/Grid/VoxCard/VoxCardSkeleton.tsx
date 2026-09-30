import { Skeleton } from "@/components/ui/skeleton";
import { voxCardTitleHalfScrimGradient } from "@/features/vox/grid/cardFrameLayout";

export const VoxCardSkeleton = () => {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded bg-surface-elevated/90 ring-1 ring-fg/5">
      <Skeleton className="absolute inset-0 rounded-none bg-fg/[0.06]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[50%]"
        style={{ backgroundImage: voxCardTitleHalfScrimGradient }}
      />
      <div className="relative z-[1] flex h-full flex-col justify-between p-2">
        <div className="flex justify-between gap-1">
          <Skeleton className="h-5 w-12 shrink-0 rounded bg-fg/12" />
          <Skeleton className="h-5 w-20 shrink-0 rounded bg-fg/12" />
        </div>
        <div className="space-y-2 pb-1 pt-10">
          <Skeleton className="h-4 w-full rounded bg-fg/15" />
          <Skeleton className="h-4 w-[80%] max-w-[90%] rounded bg-fg/12" />
        </div>
      </div>
    </div>
  );
};
