import axios from "axios";
import { initMocks, isMockDemoMode } from "@/mocks/initMocks";
/**
 * No default `Content-Type`: forcing `application/json` would break `FormData` POSTs such as
 * `/api/upload`. Axios still sends JSON for plain objects.
 */
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});
if (isMockDemoMode()) {
  // Requests sent before MSW starts (e.g. the header's `/api/auth/me`) would reach the real handlers.
  api.interceptors.request.use(async (config) => {
    await initMocks();
    return config;
  });
}
