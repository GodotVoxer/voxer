import { COMMENT_CREATE_INTERVAL_MS, VOX_CREATE_INTERVAL_MS } from "@/lib/limits";
import { formatRetryAfterDurationEs } from "@/lib/format/retryAfter";
import { countNoun } from "@/lib/format/plural";
import { MINUTE_MS, SECOND_MS } from "@/lib/time";

export type PostingRateLimitKind = "vox_user" | "vox_ip" | "comment_user" | "comment_ip";

export class PostingRateLimitError extends Error {
  readonly kind: PostingRateLimitKind;
  readonly remainingMs: number;

  constructor(kind: PostingRateLimitKind, remainingMs: number) {
    super(`posting_rate_limit:${kind}`);
    this.name = "PostingRateLimitError";
    this.kind = kind;
    this.remainingMs = remainingMs;
  }
}

export const postingRateLimitUserMessageEs = (
  kind: PostingRateLimitKind,
  remainingMs: number,
): string => {
  const when = formatRetryAfterDurationEs(remainingMs);
  switch (kind) {
    case "vox_user": {
      const everyMin = Math.max(1, Math.round(VOX_CREATE_INTERVAL_MS / MINUTE_MS));
      const everyPart = countNoun(everyMin, "minuto", "minutos");
      return `Solo podés publicar un vox cada ${everyPart}. Probá de nuevo en ${when}.`;
    }
    case "vox_ip":
      return `Desde esta red ya se publicó un vox recientemente. Probá de nuevo en ${when}.`;
    case "comment_user": {
      const everySec = Math.max(1, Math.round(COMMENT_CREATE_INTERVAL_MS / SECOND_MS));
      const everyPart = countNoun(everySec, "segundo", "segundos");
      return `Solo podés publicar un comentario cada ${everyPart}. Probá de nuevo en ${when}.`;
    }
    case "comment_ip":
      return `Desde esta red ya se publicó un comentario recientemente. Probá de nuevo en ${when}.`;
  }
};
