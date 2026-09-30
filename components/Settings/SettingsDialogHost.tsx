"use client";
import dynamic from "next/dynamic";
import { useSettingsStore } from "@/features/settings/store";

const SettingsDialog = dynamic(
  () => import("@/components/Settings/SettingsDialog").then((m) => m.SettingsDialog),
  { ssr: false },
);

/** The panel downloads only when opened, like the theme editor. */
export const SettingsDialogHost = () => {
  const dialogOpen = useSettingsStore((s) => s.dialogOpen);
  if (!dialogOpen) return null;
  return <SettingsDialog />;
};
