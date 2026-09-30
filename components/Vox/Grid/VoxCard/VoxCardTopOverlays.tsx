"use client";
import type { VoxListItem } from "@/lib/vox/types";
import {
  voxCardTopLeftPillSlotClassName,
  voxCardTopOverlaysRowClassName,
} from "@/features/vox/grid/cardTopPillLayout";
import { VoxCardCategoryMediaPill } from "./VoxCardCategoryMediaPill";
import { VoxCardRepliesPill } from "./VoxCardRepliesPill";
import { isCreatedAtWithinNewBadgeWindow } from "@/features/vox/grid/newBadgeWindow";

type Props = {
  vox: VoxListItem;
};

export const VoxCardTopOverlays = ({ vox }: Props) => {
  const isNew = isCreatedAtWithinNewBadgeWindow(vox.createdAt);
  const isPinned = Boolean(vox.pinnedAt);

  return (
    <div className={voxCardTopOverlaysRowClassName}>
      <div className={voxCardTopLeftPillSlotClassName}>
        <VoxCardCategoryMediaPill
          category={vox.category}
          mediaType={vox.mediaType}
          animatedImage={vox.animatedImage}
          showNew={isNew}
          showPinned={isPinned}
        />
      </div>
      <VoxCardRepliesPill replies={vox.replies} hasPoll={vox.hasPoll} />
    </div>
  );
};
