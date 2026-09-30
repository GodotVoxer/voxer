import { describe, expect, it } from "vitest";
import {
  buildCommentPushPayload,
  buildFcmV1Message,
  buildReportPushPayload,
  buildUnifiedPushData,
  buildWebPushData,
} from "@/server/push/payload";

const base = {
  voxId: "vox123",
  voxTitle: "Un título cualquiera",
  voxCategory: "General",
  voxThumbnailUrl: "https://media.example.com/uploads/2026/09/a.thumb.webp",
  commentPublicTag: "ab12",
  type: "REPLY_TO_COMMENT",
} as const;

describe("buildCommentPushPayload", () => {
  it("titles the push by notification type", () => {
    expect(buildCommentPushPayload(base)).toMatchObject({
      title: "Te respondieron",
      channel: "replies",
    });
    expect(buildCommentPushPayload({ ...base, type: "COMMENT_ON_YOUR_VOX" })).toMatchObject({
      title: "Comentaron tu vox",
      channel: "comments",
    });
    expect(buildCommentPushPayload({ ...base, type: "COMMENT_ON_FOLLOWED_VOX" })).toMatchObject({
      title: "Comentaron un vox que seguís",
      channel: "comments",
    });
  });

  it("builds the same deep link as the bell, with an uppercase tag", () => {
    expect(buildCommentPushPayload(base).path).toBe("/vox/vox123#AB12");
  });

  it("points to the vox without an anchor when there is no comment tag", () => {
    expect(buildCommentPushPayload({ ...base, commentPublicTag: null }).path).toBe("/vox/vox123");
  });

  it("truncates long titles to 60 characters", () => {
    const p = buildCommentPushPayload({ ...base, voxTitle: "x".repeat(200) });
    const inner = p.body.slice("En «".length, -1);
    expect(inner.length).toBe(60);
    expect(inner.endsWith("…")).toBe(true);
  });

  it("collapses by vox", () => {
    expect(buildCommentPushPayload(base).collapseKey).toBe("replies:vox:vox123");
    expect(buildCommentPushPayload({ ...base, type: "COMMENT_ON_YOUR_VOX" }).collapseKey).toBe(
      "comments:vox:vox123",
    );
  });

  it("hides the vox title and thumbnail in NSFW categories", () => {
    for (const category of ["Porno", "Gay", "Hentai", "Fetiches"]) {
      const p = buildCommentPushPayload({ ...base, voxCategory: category });
      expect(p.body).toBe("Abrí la app para verlo.");
      expect(p.body).not.toContain(base.voxTitle);
      expect(p.thumbnailUrl).toBeUndefined();
    }
  });

  it("keeps title and thumbnail outside NSFW", () => {
    const p = buildCommentPushPayload(base);
    expect(p.body).toContain(base.voxTitle);
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
    const p = buildReportPushPayload({
      voxId: "vox123",
      commentPublicTag: "ab12",
      reason: "GORE",
      hasComment: true,
    });
    expect(p.channel).toBe("reports");
    expect(p.path).toBe("/vox/vox123?denuncia=push#AB12");
    expect(p.collapseKey).toBe("reports");
  });

  it("a report on a vox opens the vox without an anchor", () => {
    expect(
      buildReportPushPayload({
        voxId: "vox123",
        commentPublicTag: null,
        reason: "GORE",
        hasComment: false,
      }).path,
    ).toBe("/vox/vox123?denuncia=push");
  });

  it("tells vox from comment and translates the reason", () => {
    expect(
      buildReportPushPayload({
        voxId: "v1",
        commentPublicTag: "ab12",
        reason: "SPAM",
        hasComment: true,
      }).body,
    ).toBe("Comentario denunciado — Spam");
    expect(
      buildReportPushPayload({
        voxId: "v1",
        commentPublicTag: null,
        reason: "ILLEGAL_CONTENT",
        hasComment: false,
      }).body,
    ).toBe("Vox denunciado — Contenido ilegal");
  });

  it("does not leak the reported vox title", () => {
    const p = buildReportPushPayload({
      voxId: "v1",
      commentPublicTag: null,
      reason: "GORE",
      hasComment: false,
    });
    expect(JSON.stringify(p)).not.toContain("título");
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
    const p = buildReportPushPayload({
      voxId: "v1",
      commentPublicTag: "publica1",
      reason: "OTHER",
      hasComment: true,
    });
    const json = JSON.stringify(p).toLowerCase();
    for (const forbidden of ["reporter", "reportid", "userid", "ip", "commentid"]) {
      expect(json).not.toContain(forbidden);
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
    const report = buildFcmV1Message(
      "tok",
      buildReportPushPayload({
        voxId: "v1",
        commentPublicTag: null,
        reason: "GORE",
        hasComment: false,
      }),
    );
    expect(comment.android.collapse_key).toBe("replies:vox:vox123");
    expect(comment.android.ttl).toBe("43200s");
    expect(report.android.ttl).toBe("86400s");
    expect(comment.android.priority).toBe("HIGH");
  });

  it("omits thumbnailUrl from data when there is no thumbnail", () => {
    const m = buildFcmV1Message("tok", buildCommentPushPayload({ ...base, voxThumbnailUrl: null }));
    expect(m.data.thumbnailUrl).toBeUndefined();
  });
});

describe("buildWebPushData", () => {
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
