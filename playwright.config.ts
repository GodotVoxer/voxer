import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// `localhost`, not 127.0.0.1: Next dev blocks `/_next/*` and HMR from origins it does not allow.
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  // Screenshots depend on the OS and its fonts, so the visual baseline only runs locally.
  testIgnore: process.env.CI ? ["**/visual/**"] : [],
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFileName}/{projectName}/{arg}{ext}",
  timeout: 120_000,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  expect: {
    timeout: 30_000,
    toHaveScreenshot: {
      maxDiffPixels: 0,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL: BASE_URL,
    colorScheme: "dark",
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    serviceWorkers: "allow",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    // Empty on purpose: Next does not override variables that are already set, so the demo never
    // reaches a real database, socket or bucket even when `.env` defines them.
    env: {
      NEXT_PUBLIC_USE_MOCKS: "true",
      DATABASE_URL: "",
      NEXT_PUBLIC_SOCKET_URL: "",
      SOCKET_SERVER_URL: "",
      NEXT_PUBLIC_R2_PUBLIC_BASE_URL: "",
      R2_ACCESS_KEY_ID: "",
      R2_SECRET_ACCESS_KEY: "",
      BLOB_READ_WRITE_TOKEN: "",
    },
  },
});
