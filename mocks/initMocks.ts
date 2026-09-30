export const isMockDemoMode = (): boolean => {
  return process.env.NEXT_PUBLIC_USE_MOCKS === "true";
};
let mocksStart: Promise<void> | null = null;
/** Idempotent: `AppInitializer` and the HTTP client share the same worker startup. */
export const initMocks = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve(); // Solo corre en el cliente
  if (!isMockDemoMode()) return Promise.resolve();
  mocksStart ??= import("@/mocks/browser").then(async ({ worker }) => {
    await worker.start();
  });
  return mocksStart;
};
