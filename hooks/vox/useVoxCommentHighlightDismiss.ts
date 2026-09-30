import { useEffect } from "react";

type Args = {
  clearHighlightFromUserAction: () => void;
};

export const useVoxCommentHighlightDismiss = ({ clearHighlightFromUserAction }: Args) => {
  useEffect(() => {
    const dismissSelector =
      "button, [role='button'], input[type='button'], input[type='submit'], input[type='reset']";
    const onActivate = (e: Event) => {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest(dismissSelector)) {
        clearHighlightFromUserAction();
      }
    };
    document.addEventListener("pointerdown", onActivate, true);
    document.addEventListener("click", onActivate, true);
    return () => {
      document.removeEventListener("pointerdown", onActivate, true);
      document.removeEventListener("click", onActivate, true);
    };
  }, [clearHighlightFromUserAction]);
};
