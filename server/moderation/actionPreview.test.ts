import { beforeEach, expect, it, vi } from "vitest";
import { getModerationActionPreview } from "./actionPreview";
const db = vi.hoisted(() => ({
  moderationAction: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  vox: { findUnique: vi.fn() },
  comment: { findUnique: vi.fn() },
}));
vi.mock("@/server/db/prisma", () => ({ prisma: db }));
beforeEach(() => vi.resetAllMocks());

it("lets a mod preview actions taken by an admin", async () => {
  db.moderationAction.findUnique.mockResolvedValue({
    actorUserId: "admin",
    actor: { role: "ADMIN" },
    payload: { voxId: "v1" },
  });
  db.vox.findUnique.mockResolvedValue({
    id: "v1",
    title: "Vox moderado",
    description: "Desc",
    category: "general",
    mediaType: "image",
    owner: { role: "USER" },
    mediaUrl: null,
    thumbnailUrl: null,
    youtubeVideoId: null,
    animatedImage: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  });
  const res = await getModerationActionPreview("a", "mod", 0);
  expect(res?.items).toHaveLength(1);
});
it("paginates a bulk delete and keeps purged text without exposing identity", async () => {
  const voxIds = Array.from({ length: 12 }, (_, i) => "v" + i);
  db.moderationAction.findUnique.mockResolvedValue({
    actorUserId: "mod",
    actor: { role: "MOD" },
    payload: {
      voxIds,
      snapshots: voxIds.map((id) => ({
        kind: "vox",
        id,
        authorUserId: "user",
        vox: { id, title: "Texto completo" },
      })),
    },
  });
  db.user.findUnique.mockResolvedValue({ role: "USER" });
  db.vox.findUnique.mockResolvedValue(null);
  const first = await getModerationActionPreview("a", "viewer", 0);
  expect(first?.items).toHaveLength(10);
  expect(first?.nextOffset).toBe(10);
  expect(first?.items[0]).toEqual({
    kind: "vox",
    id: "v0",
    vox: {
      id: "v0",
      title: "Texto completo",
      mediaUrl: null,
      thumbnailUrl: null,
      youtubeVideoId: null,
      animatedImage: false,
    },
  });
  const last = await getModerationActionPreview("a", "viewer", 10);
  expect(last?.items).toHaveLength(2);
  expect(last?.nextOffset).toBeNull();
});
it("protects snapshots of authors later promoted to ADMIN, even after a purge", async () => {
  db.moderationAction.findUnique.mockResolvedValue({
    actor: { role: "MOD" },
    payload: {
      voxId: "v",
      snapshots: [{ kind: "vox", id: "v", authorUserId: "new-admin", vox: { title: "Privado" } }],
    },
  });
  db.user.findUnique.mockResolvedValue({ role: "ADMIN" });
  expect((await getModerationActionPreview("a", "peer", 0))?.items).toEqual([
    { kind: "vox", id: "v", vox: null },
  ]);
});

it.each(["vox", "comment"] as const)(
  "no recupera multimedia purgada de una copia de %s",
  async (kind) => {
    const media =
      kind === "vox"
        ? {
            title: "Texto conservado",
            mediaUrl: "/uploads/removed.mp4",
            thumbnailUrl: "/uploads/removed.jpg",
            youtubeVideoId: "old",
            animatedImage: true,
          }
        : {
            body: "Texto conservado",
            imageUrl: "/uploads/removed.jpg",
            videoUrl: "/uploads/removed.mp4",
            videoPosterUrl: "/uploads/poster.jpg",
            animatedImage: true,
          };
    db.moderationAction.findUnique.mockResolvedValue({
      actor: { role: "MOD" },
      payload: {
        [kind === "vox" ? "voxId" : "commentId"]: "item",
        snapshots: [{ kind, id: "item", [kind]: media }],
      },
    });
    const current = kind === "vox" ? db.vox.findUnique : db.comment.findUnique;
    current.mockResolvedValue({
      mediaUrl: null,
      thumbnailUrl: null,
      youtubeVideoId: null,
      imageUrl: null,
      videoUrl: null,
      videoPosterUrl: null,
      animatedImage: false,
    });
    const page = await getModerationActionPreview("action", "viewer", 0);
    const item = page?.items[0];
    expect(JSON.stringify(item)).not.toContain("/uploads/");
    if (item?.kind === "vox") {
      expect(item.vox).toMatchObject({
        title: "Texto conservado",
        mediaUrl: null,
        thumbnailUrl: null,
        youtubeVideoId: null,
      });
    } else if (item?.kind === "comment") {
      expect(item.comment).toMatchObject({
        body: "Texto conservado",
        imageUrl: null,
        videoUrl: null,
        videoPosterUrl: null,
      });
    } else throw new Error("Falta preview");
  },
);

it("shows only the media that still exists on the publication", async () => {
  db.moderationAction.findUnique.mockResolvedValue({
    actor: { role: "MOD" },
    payload: {
      commentId: "c",
      snapshots: [
        { kind: "comment", id: "c", comment: { body: "texto", imageUrl: "/uploads/old.jpg" } },
      ],
    },
  });
  db.comment.findUnique.mockResolvedValue({ imageUrl: "/uploads/current.jpg" });
  expect((await getModerationActionPreview("a", "viewer", 0))?.items[0]).toMatchObject({
    comment: {
      body: "texto",
      imageUrl: "/uploads/current.jpg",
      videoUrl: null,
      videoPosterUrl: null,
    },
  });
});
