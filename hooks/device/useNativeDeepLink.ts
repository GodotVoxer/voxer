"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readAndroidBridge, type NativeCallbacks } from "@/features/native/androidBridge";
import { navigateToPushPath } from "@/features/push/navigateToPushPath";

type NativeWindow = Window & { __voxerNative?: NativeCallbacks };

/** Navigation from a notification tap with the app already running; a cold start loads the URL in `MainActivity`. */
export const useNativeDeepLink = () => {
  const router = useRouter();

  useEffect(() => {
    const bridge = readAndroidBridge(window);
    if (!bridge) return;

    const w = window as NativeWindow;
    const navigate = (path: string) => navigateToPushPath(path, router.push);

    w.__voxerNative = { ...w.__voxerNative, navigate };
    return () => {
      if (w.__voxerNative?.navigate === navigate) delete w.__voxerNative.navigate;
    };
  }, [router]);
};
