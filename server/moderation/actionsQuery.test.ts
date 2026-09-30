import { describe, expect, it, vi } from "vitest";
import {
  moderationActorUsernameWhere,
  listModerationActions,
  moderationActionListPayload,
} from "./actionsQuery";
const db = vi.hoisted(() => ({ findMany: vi.fn().mockResolvedValue([]) }));
vi.mock("@/server/db/prisma", () => ({ prisma: { moderationAction: { findMany: db.findMany } } }));

describe("moderationActorUsernameWhere", () => {
  it("returns null for blank", () => {
    expect(moderationActorUsernameWhere("   ")).toBeNull();
  });
  it("matches full or partial usernames case-insensitively", () => {
    expect(moderationActorUsernameWhere("Demo_User")).toEqual({
      actor: { username: { contains: "Demo_User", mode: "insensitive" } },
    });
    expect(moderationActorUsernameWhere("alissa")).toEqual({
      actor: { username: { contains: "alissa", mode: "insensitive" } },
    });
    expect(moderationActorUsernameWhere("Alissa")).toEqual({
      actor: { username: { contains: "Alissa", mode: "insensitive" } },
    });
    expect(moderationActorUsernameWhere("a")).toEqual({
      actor: { username: { contains: "a", mode: "insensitive" } },
    });
    expect(moderationActorUsernameWhere("cuentaoficialdealissa12")).toEqual({
      actor: { username: { contains: "cuentaoficialdealissa12", mode: "insensitive" } },
    });
  });
});

it("does not hide ADMIN actions from the history", async () => {
  await listModerationActions({
    viewerUserId: "viewer",
    take: 40,
    actorUserId: "admin",
    relatedBanId: "ban",
  });
  expect(db.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        AND: [{ actorUserId: "admin" }, { relatedBanId: "ban" }],
      },
    }),
  );
});
it("does not send preview files in the list", () => {
  expect(
    moderationActionListPayload({ voxId: "v", snapshots: [{ authorUserId: "private" }] }),
  ).toEqual({ voxId: "v" });
});
