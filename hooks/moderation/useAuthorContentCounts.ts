import { useEffect, useState } from "react";
import { fetchAuthorContentCounts, type AuthorContentCounts } from "@/features/moderation/api";
import { banContentWindow, type AuthorBanDraft } from "@/features/moderation/publicationPlan";

export type AuthorContentCountsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; counts: AuthorContentCounts }
  | { status: "error" };

const COUNTS_DEBOUNCE_MS = 300;

type Settled = { key: string; state: AuthorContentCountsState };

/** How many publications a bulk delete would reach, refreshed (debounced) as the window changes. */
export const useAuthorContentCounts = (
  ownerId: string | null,
  { contentScope, contentAmount, contentUnit }: AuthorBanDraft,
): AuthorContentCountsState => {
  const contentWindow = banContentWindow({ contentScope, contentAmount, contentUnit });
  const key = ownerId && contentWindow ? `${ownerId}:${JSON.stringify(contentWindow)}` : null;
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    const w = banContentWindow({ contentScope, contentAmount, contentUnit });
    if (!ownerId || !key || !w) return;
    const controller = new AbortController();
    const t = window.setTimeout(() => {
      fetchAuthorContentCounts(ownerId, w, controller.signal)
        .then((counts) => setSettled({ key, state: { status: "ready", counts } }))
        .catch(() => {
          if (!controller.signal.aborted) setSettled({ key, state: { status: "error" } });
        });
    }, COUNTS_DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(t);
    };
  }, [ownerId, key, contentScope, contentAmount, contentUnit]);

  if (!key) return { status: "idle" };
  return settled?.key === key ? settled.state : { status: "loading" };
};
