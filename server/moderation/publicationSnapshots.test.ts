import type { Vox } from "@prisma/client";
import { expect, it } from "vitest";
import { voxModerationSnapshot } from "./publicationSnapshots";

it("keeps the full title and description without internal identity", () => {
  const title = "Un título largo ".repeat(20);
  const description = "Contenido original\n".repeat(30);
  const row = {
    id: "vox",
    title,
    description,
    category: "General",
    mediaType: "IMAGE",
    mediaUrl: "/uploads/file.jpg",
    thumbnailUrl: "/uploads/thumb.jpg",
    youtubeVideoId: null,
    animatedImage: false,
    createdAt: new Date("2026-09-26T12:00:00Z"),
    ownerId: "private-owner",
    clientIpHash: "private-fingerprint",
  } as Vox;
  const snapshot = voxModerationSnapshot(row);
  expect(snapshot.title).toBe(title);
  expect(snapshot.description).toBe(description);
  expect(snapshot.createdAt).toBe("2026-09-26T12:00:00.000Z");
  expect(snapshot).not.toHaveProperty("ownerId");
  expect(snapshot).not.toHaveProperty("clientIpHash");
});
