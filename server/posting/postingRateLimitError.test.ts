import { describe, expect, it } from "vitest";
import { postingRateLimitUserMessageEs } from "./postingRateLimitError";

describe("postingRateLimitUserMessageEs", () => {
  it("includes the remaining time in Spanish", () => {
    expect(postingRateLimitUserMessageEs("vox_user", 125_000)).toContain(
      "Probá de nuevo en 3 minutos.",
    );
    expect(postingRateLimitUserMessageEs("vox_ip", 60_000)).toContain(
      "Probá de nuevo en 1 minuto.",
    );
    expect(postingRateLimitUserMessageEs("comment_user", 3500)).toContain(
      "Probá de nuevo en 4 segundos.",
    );
    expect(postingRateLimitUserMessageEs("comment_ip", 1000)).toContain(
      "Probá de nuevo en 1 segundo.",
    );
  });
});
