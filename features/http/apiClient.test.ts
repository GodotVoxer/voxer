import { describe, expect, it } from "vitest";
import { api } from "./apiClient";
describe("api axios client", () => {
  it("does not force a JSON Content-Type in common headers (FormData uploads)", () => {
    expect(api.defaults.headers.common["Content-Type"]).toBeUndefined();
  });
});
