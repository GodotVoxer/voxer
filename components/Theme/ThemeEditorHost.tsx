"use client";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/features/auth/store";
import { useThemeStore } from "@/features/theme/store";

const ThemeEditorPanel = dynamic(
  () => import("@/components/Theme/ThemeEditorPanel").then((m) => m.ThemeEditorPanel),
  { ssr: false },
);

/** The editor (color picker, derivation, validation) downloads only when opened. */
export const ThemeEditorHost = () => {
  const editor = useThemeStore((s) => s.editor);
  const user = useAuthStore((s) => s.user);
  if (!editor || !user) return null;
  return (
    <ThemeEditorPanel
      key={editor.kind === "edit" ? `edit-${editor.themeId}` : `create-${editor.base}`}
      target={editor}
    />
  );
};
