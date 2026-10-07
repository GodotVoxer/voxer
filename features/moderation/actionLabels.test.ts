import { describe, expect, it } from "vitest";
import type { ModerationActionRow } from "@/features/moderation/api";
import {
  moderationActionLabelEs,
  moderationActionPayloadSummary,
  moderationActionPreviewTitle,
  moderationActionSupportsUndo,
} from "./actionLabels";

const row = (
  partial: Partial<ModerationActionRow> & Pick<ModerationActionRow, "id" | "actionType">,
): ModerationActionRow => ({
  id: partial.id,
  actionType: partial.actionType,
  payload: partial.payload ?? null,
  relatedBanId: partial.relatedBanId ?? null,
  createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
  actorUsername: partial.actorUsername ?? "mod",
  actorRole: partial.actorRole ?? "MOD",
  undoneAt: partial.undoneAt ?? null,
});

describe("moderationActionLabelEs", () => {
  it("translates known types", () => {
    expect(moderationActionLabelEs("BAN_USER")).toBe("Banear usuario");
    expect(moderationActionLabelEs("PIN_VOX")).toBe("Pinear vox");
    expect(moderationActionLabelEs("UNPIN_VOX")).toBe("Despinear vox");
  });

  it("returns the raw type when unmapped", () => {
    expect(moderationActionLabelEs("UNKNOWN_X")).toBe("UNKNOWN_X");
  });
});

describe("moderationActionPayloadSummary", () => {
  it("ban: shows the reason", () => {
    const summary = moderationActionPayloadSummary(
      row({
        id: "1",
        actionType: "BAN_USER",
        payload: { reason: "spam" },
      }),
    );
    expect(summary).toBe("spam");
  });

  it("ban with network block: adds a suffix", () => {
    const summary = moderationActionPayloadSummary(
      row({
        id: "1b",
        actionType: "BAN_USER",
        payload: { reason: "abuso", clientNetworkBlock: true },
      }),
    );
    expect(summary).toBe("abuso · Restricción por huella de red");
  });

  it("bulk delete: says when the files were purged or blocked", () => {
    const summary = (media?: string) =>
      moderationActionPayloadSummary(
        row({
          id: "bulk",
          actionType: "BULK_SOFT_DELETE_USER_CONTENT",
          payload: { voxIds: ["v1"], commentIds: [], banContentLabel: "todo", media },
        }),
      );
    expect(summary()).toBe("vox: 1, comentarios: 0, todo");
    expect(summary("keep")).toBe("vox: 1, comentarios: 0, todo");
    expect(summary("purge")).toBe("vox: 1, comentarios: 0, todo, archivos borrados");
    expect(summary("block")).toBe("vox: 1, comentarios: 0, todo, archivos borrados y bloqueados");
  });

  it("recategorize: shows an arrow", () => {
    const summary = moderationActionPayloadSummary(
      row({
        id: "2",
        actionType: "RECATEGORIZE_VOX",
        payload: { previousCategory: "A", newCategory: "B" },
      }),
    );
    expect(summary).toBe("A → B");
  });

  it("recategorize: includes the vox title when present", () => {
    const summary = moderationActionPayloadSummary(
      row({
        id: "2b",
        actionType: "RECATEGORIZE_VOX",
        payload: { title: "Mi vox", previousCategory: "A", newCategory: "B" },
      }),
    );
    expect(summary).toBe("«Mi vox» · A → B");
  });

  it("vox edit: shows the previous and the new title", () => {
    const summary = moderationActionPayloadSummary(
      row({
        id: "e1",
        actionType: "EDIT_VOX",
        payload: {
          voxId: "v1",
          title: "Nuevo",
          previousTitle: "Viejo",
          previousDescription: "Texto viejo",
        },
      }),
    );
    expect(summary).toBe("«Viejo» → «Nuevo»");
  });

  it("vox edit: shows the title once when only the description changed", () => {
    const summary = moderationActionPayloadSummary(
      row({
        id: "e2",
        actionType: "EDIT_VOX",
        payload: { voxId: "v1", title: "Igual", previousTitle: "Igual" },
      }),
    );
    expect(summary).toBe("«Igual»");
  });

  it("pin: shows the title", () => {
    expect(
      moderationActionPayloadSummary(
        row({
          id: "p1",
          actionType: "PIN_VOX",
          payload: { voxId: "v1", title: "Hola" },
        }),
      ),
    ).toBe("Hola");
  });

  it("invalid payload: em dash", () => {
    expect(
      moderationActionPayloadSummary(row({ id: "3", actionType: "DELETE_VOX", payload: null })),
    ).toBe("—");
  });
});

describe("moderationActionSupportsUndo", () => {
  it("pin cannot be undone", () => {
    expect(moderationActionSupportsUndo("PIN_VOX")).toBe(false);
    expect(moderationActionSupportsUndo("UNPIN_VOX")).toBe(false);
  });

  it("vox delete can be undone", () => {
    expect(moderationActionSupportsUndo("DELETE_VOX")).toBe(true);
  });
});

it("the preview title names the category change", () => {
  expect(
    moderationActionPreviewTitle(
      row({
        id: "cat",
        actionType: "RECATEGORIZE_VOX",
        payload: { previousCategory: "General", newCategory: "Política" },
      }),
    ),
  ).toBe("Vox recategorizado: General → Política");
});
