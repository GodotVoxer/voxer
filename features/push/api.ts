import { api } from "@/features/http/apiClient";
import type { WebPushSubscriptionJson } from "@/features/push/webPushBrowser";

type PushDevicePlatform = "android" | "ios";

type NativePushRegistration =
  | { token: string; platform: PushDevicePlatform; appVersion?: string }
  | { platform: "unifiedpush"; subscription: WebPushSubscriptionJson; appVersion?: string };

export const registerPushDevice = async (input: NativePushRegistration): Promise<void> => {
  await api.post("/push/devices", input);
};

export const registerWebPushSubscription = async (
  subscription: WebPushSubscriptionJson,
): Promise<void> => {
  await api.post("/push/devices", { platform: "web", subscription });
};

/** For Web Push and UnifiedPush the `token` is the subscription endpoint. */
export const unregisterPushDevice = async (token: string): Promise<void> => {
  await api.delete("/push/devices", { data: { token } });
};
