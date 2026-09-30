import { z } from "zod";
import { FCM_TOKEN_MAX, FCM_TOKEN_MIN, isPlausibleFcmToken } from "@/server/push/deviceToken";
import {
  normalizeWebPushSubscription,
  WEB_PUSH_ENDPOINT_MAX,
} from "@/server/push/webPushSubscription";
import { isAllowedUnifiedPushEndpoint } from "@/server/push/unifiedPushEndpoint";

const pushDeviceFcmRegisterSchema = z.object({
  token: z
    .string()
    .trim()
    .min(FCM_TOKEN_MIN)
    .max(FCM_TOKEN_MAX)
    .refine(isPlausibleFcmToken, "Token de dispositivo inválido"),
  platform: z.enum(["android", "ios"]).default("android"),
  appVersion: z.string().trim().max(32).optional(),
});

/** Shape of `PushSubscription.toJSON()`; the endpoint must belong to a known push service. */
const pushDeviceWebRegisterSchema = z.object({
  platform: z.literal("web"),
  subscription: z
    .object({
      endpoint: z.string().trim().min(1).max(WEB_PUSH_ENDPOINT_MAX),
      keys: z.object({
        p256dh: z.string().trim().min(1).max(128),
        auth: z.string().trim().min(1).max(64),
      }),
    })
    .refine(
      (sub) => normalizeWebPushSubscription({ endpoint: sub.endpoint, ...sub.keys }) !== null,
      "Suscripción de notificaciones inválida",
    ),
});

/** The F-Droid app: a Web Push subscription on the user's UnifiedPush distributor. */
const pushDeviceUnifiedPushRegisterSchema = z.object({
  platform: z.literal("unifiedpush"),
  subscription: z
    .object({
      endpoint: z.string().trim().min(1).max(WEB_PUSH_ENDPOINT_MAX),
      keys: z.object({
        p256dh: z.string().trim().min(1).max(128),
        auth: z.string().trim().min(1).max(64),
      }),
    })
    .refine(
      (sub) =>
        normalizeWebPushSubscription(
          { endpoint: sub.endpoint, ...sub.keys },
          isAllowedUnifiedPushEndpoint,
        ) !== null,
      "Suscripción de notificaciones inválida",
    ),
  appVersion: z.string().trim().max(32).optional(),
});

export const pushDeviceRegisterSchema = z.union([
  pushDeviceWebRegisterSchema,
  pushDeviceUnifiedPushRegisterSchema,
  pushDeviceFcmRegisterSchema,
]);

export const pushDeviceUnregisterSchema = z.object({
  token: z.string().trim().min(1).max(FCM_TOKEN_MAX),
});
