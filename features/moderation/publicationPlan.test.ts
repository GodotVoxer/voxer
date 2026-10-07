import { describe, expect, it } from "vitest";
import {
  authorContentCountsLabel,
  banContentWindow,
  DEFAULT_AUTHOR_BAN_DRAFT,
  illegalContentPreset,
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

describe("bulk media", () => {
  const withMedia = (b: Partial<AuthorBanDraft>): PublicationModerationPlan => ({
    kind: "vox",
    fate: "delete",
    ban: { ...ban, contentScope: "all", ...b },
  });

  it("warns that the files of the whole history cannot be recovered", () => {
    const keep = publicationModerationSummary(withMedia({ contentMedia: "keep" }));
    expect(keep.some((l) => l.tone === "danger")).toBe(false);
    const purge = publicationModerationSummary(withMedia({ contentMedia: "purge" })).at(-1);
    expect(purge).toEqual({ text: expect.stringContaining("ya estaban ocultas"), tone: "danger" });
    const block = publicationModerationSummary(withMedia({ contentMedia: "block" })).at(-1);
    expect(block?.text).toContain("nadie va a poder volver a subirlos");
  });

  it("ignores the media choice when no other publication is deleted", () => {
    const lines = publicationModerationSummary(
      withMedia({ contentScope: "none", contentMedia: "block" }),
    );
    expect(lines.some((l) => l.tone === "danger")).toBe(false);
    expect(
      publicationModerationProblem(withMedia({ contentScope: "none", contentMedia: "block" })),
    ).toBeNull();
  });

  it("requires an explicit confirmation before deleting the files", () => {
    expect(publicationModerationProblem(withMedia({ contentMedia: "purge" }))).toMatch(/Confirmá/);
    expect(
      publicationModerationProblem(
        withMedia({ contentMedia: "purge", contentMediaConfirmed: true }),
      ),
    ).toBeNull();
  });
});

describe("illegalContentPreset", () => {
  it("marks everything, blocking only for admins, and still asks for confirmation", () => {
    const admin = illegalContentPreset(DEFAULT_AUTHOR_BAN_DRAFT, true);
    expect(admin.fate).toBe("block");
    expect(admin.ban).toMatchObject({
      reason: "Contenido ilegal.",
      permanent: true,
      blockNetwork: true,
      contentScope: "all",
      contentMedia: "block",
      contentMediaConfirmed: false,
    });
    const mod = illegalContentPreset(DEFAULT_AUTHOR_BAN_DRAFT, false);
    expect(mod.fate).toBe("purge");
    expect(mod.ban.contentMedia).toBe("purge");
  });

  it("keeps a reason already written", () => {
    const r = illegalContentPreset({ ...ban, reason: "gore" }, true);
    expect(r.ban.reason).toBe("gore");
  });

  it("drops an earlier confirmation", () => {
    const r = illegalContentPreset({ ...ban, contentMediaConfirmed: true }, true);
    expect(r.ban.contentMediaConfirmed).toBe(false);
  });
});

describe("banContentWindow", () => {
  it("maps the scope to the request window", () => {
    expect(banContentWindow({ ...ban, contentScope: "none" })).toBeNull();
    expect(banContentWindow({ ...ban, contentScope: "all" })).toEqual({ forever: true });
    expect(
      banContentWindow({
        ...ban,
        contentScope: "window",
        contentAmount: "2",
        contentUnit: "HOURS",
      }),
    ).toEqual({ forever: false, amount: 2, unit: "HOURS" });
    expect(banContentWindow({ ...ban, contentScope: "window", contentAmount: "" })).toBeNull();
  });
});

describe("authorContentCountsLabel", () => {
  it("counts visible publications and those with files", () => {
    expect(authorContentCountsLabel({ voxCount: 1, commentCount: 3, mediaCount: 1 })).toBe(
      "Alcanza 1 vox y 3 comentarios. 1 publicación tiene archivos, contando las ya ocultas.",
    );
    expect(authorContentCountsLabel({ voxCount: 0, commentCount: 0, mediaCount: 2 })).toBe(
      "No tiene publicaciones visibles en ese período. 2 publicaciones tienen archivos, contando las ya ocultas.",
    );
    expect(authorContentCountsLabel({ voxCount: 2, commentCount: 1, mediaCount: 0 })).toBe(
      "Alcanza 2 vox y 1 comentario. Ninguna tiene archivos.",
    );
  });
});
