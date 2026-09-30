import { describe, expect, it } from "vitest";
import {
  encodeAuthorPublicationsCursor,
  parseAuthorPublicationsCursor,
} from "@/server/moderation/authorPublicationsCursor";

describe("moderationAuthorPublicationsCursor", () => {
  it("encodes and decodes", () => {
    const payload = { t: "2024-01-02T03:04:05.000Z", id: "clxyz123" };
    const enc = encodeAuthorPublicationsCursor(payload);
    expect(parseAuthorPublicationsCursor(enc)).toEqual(payload);
  });

  it("rejects an invalid cursor", () => {
    expect(parseAuthorPublicationsCursor(null)).toBeNull();
    expect(parseAuthorPublicationsCursor("")).toBeNull();
    expect(parseAuthorPublicationsCursor("@@@")).toBeNull();
  });
});
