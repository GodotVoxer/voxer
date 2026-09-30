type PushEnv = Readonly<Record<string, string | undefined>>;

const masterSwitchOn = (env: PushEnv): boolean => env.PUSH_ENABLED?.trim().toLowerCase() === "true";

const present = (v: string | undefined): boolean => Boolean(v?.trim());

/** Android (FCM HTTP v1): the global switch plus the service account's three credentials. */
export const fcmPushEnabled = (env: PushEnv = process.env): boolean =>
  masterSwitchOn(env) &&
  present(env.FIREBASE_PROJECT_ID) &&
  present(env.FIREBASE_CLIENT_EMAIL) &&
  present(env.FIREBASE_PRIVATE_KEY);

/** Desktop (standard Web Push with VAPID). The public key is `NEXT_PUBLIC_` because browsers need it to subscribe. */
export const webPushEnabled = (env: PushEnv = process.env): boolean =>
  masterSwitchOn(env) &&
  present(env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY) &&
  present(env.WEB_PUSH_VAPID_PRIVATE_KEY) &&
  present(env.WEB_PUSH_VAPID_SUBJECT);

/** Without the switch or any complete transport, the whole push module is a silent no-op. */
export const pushEnabled = (env: PushEnv = process.env): boolean =>
  fcmPushEnabled(env) || webPushEnabled(env);
