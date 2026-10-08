"use client";
import dynamic from "next/dynamic";
import { useCategoryFilterStore } from "@/features/vox/categoryFilterStore";
import { useHydrated } from "@/hooks/common/useHydrated";

// Most visitors already answered: the dialog's code only downloads for those who have not.
const NsfwHomePromptContent = dynamic(
  () => import("./NsfwHomePromptContent").then((m) => m.NsfwHomePromptContent),
  { ssr: false },
);

/** First-visit prompt: the home grid mixes every category. Until it is answered, +18 categories stay off. */
export const NsfwHomePromptDialog = () => {
  const answered = useCategoryFilterStore((s) => s.nsfwPromptAnswered);
  // The answer lives in localStorage: rendering only on the client keeps the server HTML from showing
  // the prompt to someone who already chose.
  const hydrated = useHydrated();

  if (!hydrated || answered) return null;
  return <NsfwHomePromptContent />;
};
