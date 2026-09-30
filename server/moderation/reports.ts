import { Prisma, type ReportReason } from "@prisma/client";
import { after } from "next/server";
import { prisma } from "@/server/db/prisma";
import { emitToUserRoom } from "@/server/realtime/broadcast";
import { hashClientIpFromRawHeaderValue } from "@/server/http/clientIpHash";
import { buildReportDedupeKey } from "@/server/moderation/reportDedupeKey";
import { reportReasonLabelEs } from "@/lib/moderation/reportReasonLabels";
import { listStaffUserIds } from "@/server/moderation/permissions";
import { sendPushToUserIds } from "@/server/push/send";
import { buildReportPushPayload } from "@/server/push/payload";

const notifyStaffOfReport = async (input: {
  voxId: string;
  commentPublicTag: string | null;
  reason: ReportReason;
  hasComment: boolean;
}): Promise<void> => {
  const ids = await listStaffUserIds();
  if (ids.length === 0) return;
  await Promise.allSettled([
    ...ids.map((id) => emitToUserRoom(id, "moderation-notification:new", {})),
    sendPushToUserIds(ids, buildReportPushPayload(input)),
  ]);
};

export const createReportWithStaffNotifications = async (input: {
  reporterUserId: string;
  voxId: string;
  commentId?: string | null;
  reason: ReportReason;
  details?: string | null;
  clientIpRaw: string;
}): Promise<
  { ok: true; reportId: string } | { ok: false; kind: "not_found" | "gone" | "duplicate" }
> => {
  const vox = await prisma.vox.findFirst({
    where: { id: input.voxId, deletedAt: null },
    select: { id: true, title: true, thumbnailUrl: true },
  });
  if (!vox) return { ok: false, kind: "not_found" };
  let commentHash: string | null = null;
  if (input.commentId) {
    const c = await prisma.comment.findFirst({
      where: { id: input.commentId, voxId: input.voxId, deletedAt: null },
      select: { publicTag: true },
    });
    if (!c) return { ok: false, kind: "gone" };
    commentHash = c.publicTag;
  }
  const reportDedupeKey = buildReportDedupeKey({
    voxId: input.voxId,
    commentId: input.commentId,
  });
  const reporterIpHash = hashClientIpFromRawHeaderValue(input.clientIpRaw);
  const label = reportReasonLabelEs(input.reason);
  const message = input.commentId
    ? `Un usuario denunció un comentario en el vox «${vox.title}». Motivo: ${label}.`
    : `Un usuario denunció el vox «${vox.title}». Motivo: ${label}.`;
  const staffIds = await listStaffUserIds();
  try {
    const report = await prisma.$transaction(async (tx) => {
      const r = await tx.report.create({
        data: {
          reporterUserId: input.reporterUserId,
          voxId: input.voxId,
          commentId: input.commentId ?? null,
          reason: input.reason,
          details: input.details?.trim() || null,
          reportDedupeKey,
          reporterIpHash,
        },
      });
      if (staffIds.length > 0) {
        await tx.staffNotification.createMany({
          data: staffIds.map((userId) => ({
            userId,
            reportId: r.id,
            message,
            voxId: vox.id,
            thumbnailUrl: vox.thumbnailUrl,
            commentHash,
          })),
        });
      }
      return r;
    });
    // Inside `after()` so the push round-trip does not delay POST /api/reports.
    after(() =>
      notifyStaffOfReport({
        voxId: input.voxId,
        commentPublicTag: commentHash,
        reason: input.reason,
        hasComment: Boolean(input.commentId),
      }),
    );
    return { ok: true, reportId: report.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, kind: "duplicate" };
    }
    throw e;
  }
};
