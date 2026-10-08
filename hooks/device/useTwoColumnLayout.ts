"use client";

import { TWO_COLUMN_MEDIA_QUERY } from "@/features/device/mediaQueries";
import { useMediaQuery } from "@/hooks/device/useMediaQuery";

export const useTwoColumnLayout = () => useMediaQuery(TWO_COLUMN_MEDIA_QUERY, true);
