"use client";

import { usePathname } from "next/navigation";
import { useVoxStore } from "@/features/vox/store";
import { useHomeFeedPush } from "@/hooks/vox/useHomeFeedPush";
import { isMockDemoMode } from "@/mocks/initMocks";
import { realtimePushEnabled } from "@/lib/realtime/mode";

export const HomeFeedRealtimeBridge = () => {
  const pathname = usePathname();
  const searchQuery = useVoxStore((s) => s.defaultListSearchQuery);
  const categoryCode = useVoxStore((s) => s.defaultListCategoryCode);

  const onHomeFeed = pathname === "/" || Boolean(categoryCode && pathname === `/${categoryCode}`);
  const enabled = onHomeFeed && !isMockDemoMode() && !searchQuery?.trim();

  useHomeFeedPush({
    // The adapter resolves the transport URL; here it only matters whether push is on.
    enabled: realtimePushEnabled() && enabled,
    categoryCode,
  });

  return null;
};
