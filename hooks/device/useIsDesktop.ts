"use client";

import { DESKTOP_MEDIA_QUERY } from "@/features/device/mediaQueries";
import { useMediaQuery } from "@/hooks/device/useMediaQuery";

export const useIsDesktop = () => useMediaQuery(DESKTOP_MEDIA_QUERY, true);
