import axios from "axios";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** HTTP status of a failed API call, or null for anything that is not an API response. */
export const apiErrorStatus = (error: unknown): number | null =>
  axios.isAxiosError(error) ? (error.response?.status ?? null) : null;

/** JSON body of a failed API call, when it is an object. */
export const apiErrorBody = (error: unknown): Record<string, unknown> | null => {
  if (!axios.isAxiosError(error)) return null;
  const data: unknown = error.response?.data;
  return isRecord(data) ? data : null;
};

/** Message of an error thrown on the client itself, not by an API call. */
export const clientThrownErrorMessage = (error: unknown): string | null => {
  if (axios.isAxiosError(error)) return null;
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return null;
};

export const userFacingApiErrorMessage = (error: unknown): string | null => {
  const data = apiErrorBody(error);
  if (!data) return null;
  for (const value of [data.error, data.message]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
};
