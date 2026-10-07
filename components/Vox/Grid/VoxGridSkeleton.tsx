import { VoxCardSkeleton } from "./VoxCard/VoxCardSkeleton";
import { VOX_GRID_GAP_PX, VOX_GRID_RIGHT_RING_SAFE_PX } from "@/features/vox/grid/gridLayout";

type Props = {
  count?: number;
};

const skeletonGridStyle = {
  gap: VOX_GRID_GAP_PX,
  paddingRight: VOX_GRID_RIGHT_RING_SAFE_PX,
} as const;

/**
 * Pure CSS so the server HTML already has the final size (measuring in JS painted 1px cells until
 * hydration). The breakpoints mirror `getVoxGridTrackLayout`; keep them in sync.
 */
export const VoxGridSkeleton = ({ count = 12 }: Props) => {
  return (
    <div className="@container w-full min-w-0">
      <div
        className="grid grid-cols-2 @min-[640px]:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] @min-[768px]:grid-cols-[repeat(auto-fill,minmax(clamp(200px,calc(100cqw/6.5),340px),1fr))]"
        style={skeletonGridStyle}
      >
        {Array.from({ length: count }, (_, i) => (
          <VoxCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};
