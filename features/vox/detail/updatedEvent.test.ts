import { describe, expect, it } from "vitest";
import { voxUpdatedEffect } from "@/features/vox/detail/updatedEvent";

describe("voxUpdatedEffect", () => {
  it("reloads when the owner's edit carries a title or description", () => {
    expect(voxUpdatedEffect({ voxId: "v1", title: "Nuevo" })).toEqual({ kind: "reload" });
    expect(voxUpdatedEffect({ voxId: "v1", description: "Otra" })).toEqual({ kind: "reload" });
  });

  it("patches the category without reloading the detail", () => {
    expect(voxUpdatedEffect({ voxId: "v1", category: "General" })).toEqual({
      kind: "patch-category",
      category: "General",
    });
  });

  it("ignores the pin, which only reorders the grid", () => {
    expect(voxUpdatedEffect({ voxId: "v1", pinnedAt: "2026-09-23T10:00:00.000Z" })).toEqual({
      kind: "ignore",
    });
    expect(voxUpdatedEffect({ voxId: "v1", pinnedAt: null })).toEqual({ kind: "ignore" });
  });

  it("text wins over category if both arrive", () => {
    expect(voxUpdatedEffect({ title: "T", category: "General" })).toEqual({ kind: "reload" });
  });

  it("ignores an empty or non-string category instead of rendering it", () => {
    expect(voxUpdatedEffect({ category: "   " })).toEqual({ kind: "ignore" });
    expect(voxUpdatedEffect({ category: 7 })).toEqual({ kind: "ignore" });
  });

  it("tolerates non-object payloads", () => {
    expect(voxUpdatedEffect(null)).toEqual({ kind: "ignore" });
    expect(voxUpdatedEffect("x")).toEqual({ kind: "ignore" });
    expect(voxUpdatedEffect(undefined)).toEqual({ kind: "ignore" });
  });
});
