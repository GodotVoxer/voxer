"use client";

import { MOBILE_MEDIA_QUERY } from "@/features/device/mediaQueries";
import { useMediaQuery } from "@/hooks/device/useMediaQuery";

export const useIsMobile = () => useMediaQuery(MOBILE_MEDIA_QUERY, false);
