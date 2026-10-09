import { describe, expect, it } from "vitest";
import {
  buildCommentPushPayload,
  buildFcmV1Message,
  buildReportPushPayload,
  buildUnifiedPushData,
  buildWebPushData,
} from "@/server/push/payload";

const textComment = (body: string) => ({
  body,
  imageUrl: null,
  videoUrl: null,
  animatedImage: false,
});

const base = {
  voxId: "vox123",
  voxTitle: "Un título cualquiera",
  voxCategory: "General",
  voxThumbnailUrl: "https://media.example.com/uploads/2026/09/a.thumb.webp",
  commentPublicTag: "ab12",
  comment: textComment(">>ABCD1234\nNo estoy de acuerdo"),
  type: "REPLY_TO_COMMENT",
} as const;

const reportBase = {
  voxId: "vox123",
  voxTitle: "Un título cualquiera",
  voxDescription: "La descripción del vox",
  commentPublicTag: null,
  comment: null,
  reason: "GORE",
} as const;

const commentReport = {
  ...reportBase,
  commentPublicTag: "ab12",
  comment: textComment("El comentario denunciado"),
} as const;

describe("buildCommentPushPayload", () => {
  it("titles the push by notification type and vox", () => {
    expect(buildCommentPushPayload(base)).toMatchObject({
      title: "Te respondieron en «Un título cualquiera»",
      channel: "replies",
    });
    expect(buildCommentPushPayload({ ...base, type: "COMMENT_ON_YOUR_VOX" })).toMatchObject({
      title: "Comentaron tu vox «Un título cualquiera»",
      channel: "comments",
    });
    expect(buildCommentPushPayload({ ...base, type: "COMMENT_ON_FOLLOWED_VOX" })).toMatchObject({
      title: "Nuevo comentario en «Un título cualquiera»",
      channel: "comments",
    });
  });

  it("carries the comment text, without the reply tokens", () => {
    const p = buildCommentPushPayload(base);
    expect(p.body).toBe("No estoy de acuerdo");
    expect(p.expandedBody).toBeUndefined();
  });

  it("previews a long comment in one line and keeps its shape for the expanded view", () => {
    const body = `primera línea\n${"x".repeat(300)}`;
    const p = buildCommentPushPayload({ ...base, comment: textComment(body) });
    expect(p.body.length).toBe(140);
    expect(p.body.startsWith("primera línea xxx")).toBe(true);
    expect(p.body.endsWith("…")).toBe(true);
    expect(p.expandedBody).toBe(body);
  });

  it("caps the expanded text", () => {
    const p = buildCommentPushPayload({ ...base, comment: textComment("x".repeat(4000)) });
    expect(p.expandedBody?.length).toBe(600);
    expect(p.expandedBody?.endsWith("…")).toBe(true);
  });

  it("labels a comment without text", () => {
    const p = buildCommentPushPayload({
      ...base,
      comment: { ...textComment(""), imageUrl: "/uploads/a.webp" },
    });
    expect(p.body).toBe("Imagen");
  });

  it("builds the same deep link as the bell, with an uppercase tag", () => {
    expect(buildCommentPushPayload(base).path).toBe("/vox/vox123#AB12");
  });

  it("points to the vox without an anchor when there is no comment tag", () => {
    expect(buildCommentPushPayload({ ...base, commentPublicTag: null }).path).toBe("/vox/vox123");
  });

  it("truncates long vox titles to 60 characters", () => {
    const p = buildCommentPushPayload({ ...base, voxTitle: "x".repeat(200) });
    const inner = p.title.slice("Te respondieron en «".length, -1);
    expect(inner.length).toBe(60);
    expect(inner.endsWith("…")).toBe(true);
  });

  it("collapses by vox", () => {
    expect(buildCommentPushPayload(base).collapseKey).toBe("replies:vox:vox123");
    expect(buildCommentPushPayload({ ...base, type: "COMMENT_ON_YOUR_VOX" }).collapseKey).toBe(
      "comments:vox:vox123",
    );
  });

  it("hides the vox title and thumbnail in NSFW categories, but not the comment", () => {
    for (const category of ["Porno", "Gay", "Hentai", "Fetiches"]) {
      const p = buildCommentPushPayload({ ...base, voxCategory: category });
      expect(p.title).toBe("Te respondieron");
      expect(p.body).toBe("No estoy de acuerdo");
      expect(JSON.stringify(p)).not.toContain(base.voxTitle);
      expect(p.thumbnailUrl).toBeUndefined();
    }
  });

  it("keeps title and thumbnail outside NSFW", () => {
    const p = buildCommentPushPayload(base);
    expect(p.title).toContain(base.voxTitle);
    expect(p.thumbnailUrl).toBe(base.voxThumbnailUrl);
  });

  it("omits the thumbnail when the vox has none", () => {
    expect(
      buildCommentPushPayload({ ...base, voxThumbnailUrl: null }).thumbnailUrl,
    ).toBeUndefined();
  });
});

describe("buildReportPushPayload", () => {
  it("opens the reported content and asks to mark it read", () => {
    const p = buildReportPushPayload(commentReport);
    expect(p.channel).toBe("reports");
    expect(p.path).toBe("/vox/vox123?denuncia=push#AB12");
    expect(p.collapseKey).toBe("reports");
  });

  it("a report on a vox opens the vox without an anchor", () => {
    expect(buildReportPushPayload(reportBase).path).toBe("/vox/vox123?denuncia=push");
  });

  it("tells vox from comment and translates the reason", () => {
    expect(buildReportPushPayload({ ...commentReport, reason: "SPAM" }).title).toBe(
      "Comentario denunciado — Spam",
    );
    expect(buildReportPushPayload({ ...reportBase, reason: "ILLEGAL_CONTENT" }).title).toBe(
      "Vox denunciado — Contenido ilegal",
    );
  });

  it("shows the reported vox: title collapsed, description when expanded", () => {
    const p = buildReportPushPayload(reportBase);
    expect(p.body).toBe("Un título cualquiera");
    expect(p.expandedBody).toBe("Un título cualquiera\n\nLa descripción del vox");
  });

  it("a vox without description has nothing to expand", () => {
    const p = buildReportPushPayload({ ...reportBase, voxDescription: "  " });
    expect(p.expandedBody).toBeUndefined();
  });

  it("shows the reported comment, and which vox it is in when expanded", () => {
    const p = buildReportPushPayload(commentReport);
    expect(p.body).toBe("El comentario denunciado");
    expect(p.expandedBody).toBe("El comentario denunciado\n\nEn «Un título cualquiera»");
  });

  it("keeps the vox of a long reported comment within the cap", () => {
    const p = buildReportPushPayload({ ...commentReport, comment: textComment("x".repeat(4000)) });
    expect(p.expandedBody?.length).toBe(600);
    expect(p.expandedBody?.endsWith("…\n\nEn «Un título cualquiera»")).toBe(true);
  });
});

describe("anonymity invariant", () => {
  it("a comment payload never carries a real identity", () => {
    const p = buildCommentPushPayload(base);
    const json = JSON.stringify(p).toLowerCase();
    for (const forbidden of ["actor", "owner", "userid", "authorid", "username", "ip"]) {
      expect(json).not.toContain(forbidden);
    }
  });

  it("a report payload never carries the reporter or the report id", () => {
    const p = buildReportPushPayload(commentReport);
    const json = JSON.stringify(p).toLowerCase();
    for (const forbidden of ["reporter", "reportid", "userid", "ip", "commentid"]) {
      expect(json).not.toContain(forbidden);
    }
  });
});

describe("message size", () => {
  // Three UTF-8 bytes per UTF-16 unit: the worst case for the provider's 4 KB cap.
  const wide = (n: number) => "漢".repeat(n);
  const worstCases = [
    buildCommentPushPayload({ ...base, voxTitle: wide(200), comment: textComment(wide(4000)) }),
    buildReportPushPayload({
      ...commentReport,
      voxTitle: wide(200),
      comment: textComment(wide(4000)),
    }),
    buildReportPushPayload({ ...reportBase, voxTitle: wide(200), voxDescription: wide(4000) }),
  ];

  it("stays under the provider cap with the longest content in any alphabet", () => {
    for (const p of worstCases) {
      const fcm = JSON.stringify(buildFcmV1Message("tok", p).data);
      expect(Buffer.byteLength(fcm)).toBeLessThan(3500);
      expect(Buffer.byteLength(buildWebPushData(p))).toBeLessThan(3500);
    }
  });
});

describe("buildFcmV1Message", () => {
  it("has no notification key (data-only)", () => {
    const m = buildFcmV1Message("tok", buildCommentPushPayload(base));
    expect(m).not.toHaveProperty("notification");
  });

  it("sends every data value as a string", () => {
    const m = buildFcmV1Message("tok", buildCommentPushPayload(base));
    for (const v of Object.values(m.data)) expect(typeof v).toBe("string");
  });

  it("passes collapse_key and uses a TTL per type", () => {
    const comment = buildFcmV1Message("tok", buildCommentPushPayload(base));
    const report = buildFcmV1Message("tok", buildReportPushPayload(reportBase));
    expect(comment.android.collapse_key).toBe("replies:vox:vox123");
    expect(comment.android.ttl).toBe("43200s");
    expect(report.android.ttl).toBe("86400s");
    expect(comment.android.priority).toBe("HIGH");
  });

  it("sends the expanded text only when there is one", () => {
    expect(buildFcmV1Message("tok", buildCommentPushPayload(base)).data).not.toHaveProperty(
      "expandedBody",
    );
    const long = buildCommentPushPayload({ ...base, comment: textComment("x".repeat(300)) });
    expect(buildFcmV1Message("tok", long).data.expandedBody).toBe(long.expandedBody);
  });

  it("omits thumbnailUrl from data when there is no thumbnail", () => {
    const m = buildFcmV1Message("tok", buildCommentPushPayload({ ...base, voxThumbnailUrl: null }));
    expect(m.data.thumbnailUrl).toBeUndefined();
  });
});

describe("buildWebPushData", () => {
  it("uses the expanded text as the body, since the system cuts it on its own", () => {
    const p = buildCommentPushPayload({ ...base, comment: textComment("x".repeat(300)) });
    expect(JSON.parse(buildWebPushData(p)).body).toBe(p.expandedBody);
  });

  it("carries the same text, deep link and image as the Android push", () => {
    const p = buildCommentPushPayload(base);
    expect(JSON.parse(buildWebPushData(p))).toEqual({
      v: "1",
      kind: "comment",
      title: p.title,
      body: p.body,
      path: "/vox/vox123#AB12",
      tag: "replies:vox:vox123",
      image: base.voxThumbnailUrl,
    });
  });

  it("carries no image or vox title in NSFW either", () => {
    const data = JSON.parse(
      buildWebPushData(buildCommentPushPayload({ ...base, voxCategory: "Hentai" })),
    );
    expect(data.image).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain(base.voxTitle);
  });

  it("FCM also sends the per-vox collapse key", () => {
    expect(buildFcmV1Message("tok", buildCommentPushPayload(base)).data.collapseKey).toBe(
      "replies:vox:vox123",
    );
  });
});

describe("buildUnifiedPushData", () => {
  it("is the FCM data map as JSON, so the F-Droid app parses it the same way", () => {
    const p = buildCommentPushPayload(base);
    expect(JSON.parse(buildUnifiedPushData(p))).toEqual(buildFcmV1Message("tok", p).data);
  });
});
