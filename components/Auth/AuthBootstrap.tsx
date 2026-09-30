"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store";
export const AuthBootstrap = () => {
  const refresh = useAuthStore((s) => s.refresh);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return null;
};
