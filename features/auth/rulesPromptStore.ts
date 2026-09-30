import { create } from "zustand";
import { RULES_NOT_ACCEPTED_CODE } from "@/lib/auth/communityRules";
import { acceptRulesRequest } from "./api";
import { useAuthStore } from "./store";
import { apiErrorBody } from "@/features/http/responseErrors";

/**
 * `register`: acceptance travels with the sign-up, so the dialog only confirms.
 * `login` and `publish`: the account exists and accepting is saved on the server.
 */
export type RulesPromptReason = "register" | "login" | "publish";

type RulesPromptState = {
  reason: RulesPromptReason | null;
  resolve: ((accepted: boolean) => void) | null;
  request: (reason: RulesPromptReason) => Promise<boolean>;
  settle: (accepted: boolean) => void;
};

export const useRulesPromptStore = create<RulesPromptState>((set, get) => ({
  reason: null,
  resolve: null,
  request: (reason) =>
    new Promise<boolean>((resolve) => {
      // An earlier unanswered request counts as cancelled: never two waiting at once.
      get().resolve?.(false);
      set({ reason, resolve });
    }),
  settle: (accepted) => {
    const { resolve } = get();
    set({ reason: null, resolve: null });
    resolve?.(accepted);
  },
}));

export const persistRulesAcceptance = async (): Promise<void> => {
  await acceptRulesRequest();
  const { user, setUser } = useAuthStore.getState();
  if (user) setUser({ ...user, rulesAccepted: true });
};

/** `true` when the user may post: they had accepted already or accept now. */
export const ensureRulesAccepted = async (): Promise<boolean> => {
  const user = useAuthStore.getState().user;
  if (!user || user.rulesAccepted) return true;
  return useRulesPromptStore.getState().request("publish");
};

/** Fallback for clients that wrongly believed the rules were accepted (e.g. an old bundle). */
export const isRulesNotAcceptedError = (e: unknown): boolean => {
  return apiErrorBody(e)?.code === RULES_NOT_ACCEPTED_CODE;
};

export const markRulesNotAccepted = () => {
  const { user, setUser } = useAuthStore.getState();
  if (user) setUser({ ...user, rulesAccepted: false });
};
