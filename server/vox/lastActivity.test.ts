import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { recomputeVoxLastActivity } from "./lastActivity";

const makeDb = () => {
  const executeRaw = vi.fn().mockResolvedValue(1);
  return { db: { $executeRaw: executeRaw } as unknown as PrismaClient, executeRaw };
};

describe("recomputeVoxLastActivity", () => {
  it("does nothing without vox ids", async () => {
    const { db, executeRaw } = makeDb();
    await recomputeVoxLastActivity(db, []);
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it("updates each vox once, counting only visible comments", async () => {
    const { db, executeRaw } = makeDb();
    await recomputeVoxLastActivity(db, ["v1", "v2", "v1"]);
    expect(executeRaw).toHaveBeenCalledTimes(1);
    const [strings, ...values] = executeRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
    expect(strings.join("?")).toContain('c."deletedAt" IS NULL');
    expect(values).toHaveLength(1);
    expect((values[0] as { values: unknown[] }).values).toEqual(["v1", "v2"]);
  });
});
