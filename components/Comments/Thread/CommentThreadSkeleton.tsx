import { Skeleton } from "@/components/ui/skeleton";
export const CommentThreadSkeleton = () => {
  return (
    <div className="space-y-3 px-1 py-2" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-lg border border-fg/5 bg-surface-raised/30 p-3">
          <Skeleton className="size-10 shrink-0 rounded-full bg-fg/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-24 rounded bg-fg/10" />
            <Skeleton className="h-3 w-full rounded bg-fg/[0.06]" />
            <Skeleton className="h-3 w-[88%] rounded bg-fg/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
};
