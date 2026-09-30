"use client";

import { useEffect } from "react";
import { installFullscreenScrollRestore } from "@/features/device/fullscreenScrollRestore";

export const useFullscreenScrollRestore = () => {
  useEffect(() => installFullscreenScrollRestore(window), []);
};
