"use client";

import { FINE_POINTER_MEDIA_QUERY } from "@/features/device/mediaQueries";
import { useMediaQuery } from "@/hooks/device/useMediaQuery";

export const useCanHover = () => useMediaQuery(FINE_POINTER_MEDIA_QUERY, false);
