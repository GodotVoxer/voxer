import { expect, it } from "vitest";
import { moderationActionTargets } from "./actionTargets";
it("identifies a single action without confusing it with the containing vox", () => {
  expect(moderationActionTargets({ commentId: "c", voxId: "v" })).toEqual([
    { kind: "comment", id: "c" },
  ]);
  expect(moderationActionTargets({ voxId: "v" })).toEqual([{ kind: "vox", id: "v" }]);
});
it("lists bulk deletions without duplicates or invalid ids", () => {
  expect(moderationActionTargets({ voxIds: ["v", "v", 3], commentIds: ["c", null] })).toEqual([
    { kind: "vox", id: "v" },
    { kind: "comment", id: "c" },
  ]);
  expect(moderationActionTargets(null)).toEqual([]);
});
