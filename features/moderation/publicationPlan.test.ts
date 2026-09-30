import { describe, expect, it } from "vitest";
import {
  DEFAULT_AUTHOR_BAN_DRAFT,
  publicationModerationConfirmLabel,
  publicationModerationProblem,
  publicationModerationSummary,
  type AuthorBanDraft,
  type PublicationModerationPlan,
} from "@/features/moderation/publicationPlan";

const ban: AuthorBanDraft = { ...DEFAULT_AUTHOR_BAN_DRAFT, reason: "spam" };
const texts = (plan: PublicationModerationPlan) =>
  publicationModerationSummary(plan).map((l) => l.text);

describe("publicationModerationSummary", () => {
  it("deleting only the publication does not mention the author", () => {
    expect(texts({ kind: "comment", fate: "delete", ban: null })).toEqual([
      "Se elimina este comentario (reversible por 7 días desde el historial).",
    ]);
  });

  it("purge and block are irreversible and the block does not repeat the purge", () => {
    const purge = publicationModerationSummary({ kind: "vox", fate: "purge", ban: null });
    expect(purge).toHaveLength(1);
    expect(purge[0]?.tone).toBe("danger");
    const block = publicationModerationSummary({ kind: "vox", fate: "block", ban: null });
    expect(block).toHaveLength(1);
    expect(block[0]?.text).toContain("nadie va a poder volver a subirlo");
  });

  it("combines the publication with the ban and the deletion of other posts", () => {
    expect(
      texts({
        kind: "vox",
        fate: "block",
        ban: { ...ban, permanent: true, blockNetwork: true, contentScope: "window" },
      }),
    ).toEqual([
      expect.stringContaining("Se elimina este vox, se borra su multimedia"),
      "El autor queda baneado para siempre.",
      "También se banea la red desde la que se conectó.",
      "Se borran sus vox y comentarios de los últimos 10 minutos (reversible por 7 días).",
    ]);
  });

  it("agrees in number and never invents an empty duration", () => {
    expect(
      texts({ kind: "vox", fate: "keep", ban: { ...ban, amount: "1", unit: "HOURS" } }),
    ).toEqual(["El autor queda baneado 1 hora."]);
    expect(texts({ kind: "vox", fate: "keep", ban: { ...ban, amount: "" } })[0]).toBe(
      "Falta completar la duración del ban.",
    );
    expect(
      texts({
        kind: "vox",
        fate: "keep",
        ban: { ...ban, contentScope: "window", contentAmount: "0" },
      })[1],
    ).toBe("Falta completar la ventana de publicaciones a borrar.");
  });
});

describe("publicationModerationProblem", () => {
  it("requires at least one action", () => {
    expect(publicationModerationProblem({ kind: "vox", fate: "keep", ban: null })).toMatch(/Elegí/);
    expect(publicationModerationProblem({ kind: "vox", fate: "delete", ban: null })).toBeNull();
  });

  it("validates the ban form only when banning", () => {
    const plan = (b: Partial<AuthorBanDraft>): PublicationModerationPlan => ({
      kind: "comment",
      fate: "delete",
      ban: { ...ban, ...b },
    });
    expect(publicationModerationProblem(plan({ reason: "  " }))).toMatch(/motivo/);
    expect(publicationModerationProblem(plan({ amount: "1.5" }))).toMatch(/duración/);
    expect(publicationModerationProblem(plan({ permanent: true, amount: "" }))).toBeNull();
    expect(
      publicationModerationProblem(plan({ contentScope: "window", contentAmount: "" })),
    ).toMatch(/ventana/);
    expect(
      publicationModerationProblem(plan({ contentScope: "all", contentAmount: "" })),
    ).toBeNull();
  });
});

describe("publicationModerationConfirmLabel", () => {
  it("names what is about to happen", () => {
    expect(publicationModerationConfirmLabel({ kind: "vox", fate: "purge", ban: null })).toBe(
      "Eliminar",
    );
    expect(publicationModerationConfirmLabel({ kind: "vox", fate: "keep", ban })).toBe(
      "Banear autor",
    );
    expect(publicationModerationConfirmLabel({ kind: "vox", fate: "delete", ban })).toBe(
      "Eliminar y banear",
    );
  });
});
