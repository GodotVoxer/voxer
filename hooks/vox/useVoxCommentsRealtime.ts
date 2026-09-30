"use client";

import { useVoxCommentsPush, type VoxCommentsRealtimeArgs } from "@/hooks/vox/useVoxCommentsPush";

export const useVoxCommentsRealtime = (args: VoxCommentsRealtimeArgs) => {
  useVoxCommentsPush(args);
};
