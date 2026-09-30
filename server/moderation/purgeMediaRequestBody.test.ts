import { describe, expect, it } from "vitest";
import { readPurgeMediaBlockFlag } from "@/server/moderation/purgeMediaRequestBody";

const req = (body: string): Request => new Request("https://voxer.pro/x", { method: "POST", body });

describe("readPurgeMediaBlockFlag", () => {
  it("a POST without a body is still a purge without block", async () => {
    await expect(readPurgeMediaBlockFlag(req(""))).resolves.toBe(false);
  });

  it("reads the explicit flag", async () => {
    await expect(readPurgeMediaBlockFlag(req('{"block":true}'))).resolves.toBe(true);
    await expect(readPurgeMediaBlockFlag(req('{"block":false}'))).resolves.toBe(false);
  });

  it("accepts an empty object", async () => {
    await expect(readPurgeMediaBlockFlag(req("{}"))).resolves.toBe(false);
  });

  it("rejects invalid JSON, extra fields and wrong types", async () => {
    await expect(readPurgeMediaBlockFlag(req("no-json"))).resolves.toBeNull();
    await expect(readPurgeMediaBlockFlag(req('{"block":true,"x":1}'))).resolves.toBeNull();
    await expect(readPurgeMediaBlockFlag(req('{"block":"si"}'))).resolves.toBeNull();
  });
});
