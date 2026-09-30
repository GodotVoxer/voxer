import { describe, it, expect } from "vitest";
import {
  mapStaffNotificationsToVirtualRows,
  mapUserNotificationsToVirtualRows,
} from "./panelVirtualListRow";

describe("mapUserNotificationsToVirtualRows", () => {
  it("uppercases comment anchor for href", () => {
    const rows = mapUserNotificationsToVirtualRows([
      {
        id: "1",
        readAt: null,
        voxId: "v1",
        message: "m",
        thumbnailUrl: null,
        commentPublicTag: "ab12",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(rows[0]?.anchorUpper).toBe("AB12");
  });

  it("null anchor when no comment tag", () => {
    const rows = mapUserNotificationsToVirtualRows([
      {
        id: "1",
        readAt: "2026-01-01T00:00:00.000Z",
        voxId: "v1",
        message: "m",
        thumbnailUrl: null,
        commentPublicTag: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(rows[0]?.anchorUpper).toBeNull();
  });
});

describe("mapStaffNotificationsToVirtualRows", () => {
  it("uppercases comment hash for href", () => {
    const rows = mapStaffNotificationsToVirtualRows([
      {
        id: "s1",
        message: "denuncia",
        thumbnailUrl: null,
        voxId: "v1",
        commentHash: "zz99",
        readAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(rows[0]?.anchorUpper).toBe("ZZ99");
    expect(rows[0]?.reportDetails).toBeNull();
  });

  it("maps reportDetails when present", () => {
    const rows = mapStaffNotificationsToVirtualRows([
      {
        id: "s2",
        message: "denuncia con detalle",
        thumbnailUrl: null,
        voxId: "v1",
        commentHash: null,
        readAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        reportDetails: "El contenido incluye enlaces de estafa",
      },
    ]);
    expect(rows[0]?.reportDetails).toBe("El contenido incluye enlaces de estafa");
  });
});
