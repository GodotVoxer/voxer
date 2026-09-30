import type { MediaType } from "@prisma/client";
import { after } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getPostingBlockForUser } from "@/server/moderation/postingEligibility";
import {
  banToApiPayload,
  clientIpBanToApiPayload,
  type BanApiPayload,
} from "@/server/moderation/activeBan";
import { hashClientIpFromRawHeaderValue } from "@/server/http/clientIpHash";
import { extractYoutubeVideoId, youtubeThumbnailUrl } from "@/lib/media/youtube";
import { sanitizePlainText } from "@/lib/format/plainText";
import { PURGE_PER_CREATE_BATCH_MAX } from "@/lib/moderation/constants";
import { PUSH_DEVICE_PURGE_BATCH_MAX } from "@/server/push/constants";
import { VOX_ACTIVE_DB_CAP, VOX_CREATE_ADVISORY_LOCK_KEY } from "@/server/vox/constants";
import {
  VOX_AUTHOR_MAX,
  VOX_CREATE_INTERVAL_MS,
  VOX_DESCRIPTION_MAX,
  VOX_POLL_OPTION_MAX,
  VOX_TITLE_MAX,
} from "@/lib/limits";
import { createVoxSchema } from "@/lib/vox/schemas";
import type { z } from "zod";
import { broadcastVoxCreated, broadcastVoxDeleted } from "@/server/realtime/broadcast";
import { invalidateVoxDetailCache } from "@/server/vox/getVoxDetailCached";
import { getVoxListItemById } from "@/server/vox/list";
import { collectManagedUploadUrlsFromVoxSnapshot } from "@/server/media/uploadUrls";
import { cleanupManagedUploadUrlsIfUnreferenced } from "@/server/media/cleanupUnreferencedUploadUrls";
import { purgeExpiredSoftDeletes } from "@/server/moderation/purgeExpiredSoftDeletes";
import { purgeStalePushDevices } from "@/server/push/purgeStalePushDevices";
import {
  appendVoxDescriptionFeatureMarkerLines,
  parseVoxDescriptionFeatureMarkers,
} from "@/lib/vox/descriptionFeatureMarkers";
import { assertVoxCreateClientIpCooldown } from "@/server/posting/clientIpCreateCooldown";
import {
  PostingRateLimitError,
  postingRateLimitUserMessageEs,
} from "@/server/posting/postingRateLimitError";
import { validateNonYoutubeVoxMediaUrls } from "@/server/vox/createMediaUrls";

export type CreateVoxParsed = z.infer<typeof createVoxSchema>;
export type CreateVoxResult =
  | {
      ok: true;
      id: string;
    }
  | {
      ok: false;
      message: string;
      status: number;
      code?: "BANNED" | "CLIENT_NETWORK_BLOCKED";
      ban?: BanApiPayload;
    };

const EVICT_LOOP_GUARD = 500;

export const createVoxFromParsed = async (
  parsed: CreateVoxParsed,
  ctx: {
    userId: string;
    username: string;
    clientIpRaw: string;
  },
): Promise<CreateVoxResult> => {
  const fromDescription = parseVoxDescriptionFeatureMarkers(parsed.description);
  const threadUniqueIdsEnabled =
    Boolean(parsed.threadUniqueIdsEnabled) || fromDescription.threadUniqueIdsFromDescription;
  const countryFlagsEnabled =
    Boolean(parsed.countryFlagsEnabled) || fromDescription.countryFlagsFromDescription;
  const descriptionRaw = appendVoxDescriptionFeatureMarkerLines(parsed.description, {
    threadUniqueIds: threadUniqueIdsEnabled,
    countryFlags: countryFlagsEnabled,
  });
  const description = sanitizePlainText(descriptionRaw, VOX_DESCRIPTION_MAX);
  if (!description.trim()) {
    return {
      ok: false,
      message: "La descripción no puede quedar vacía.",
      status: 400,
    };
  }
  const title = sanitizePlainText(parsed.title, VOX_TITLE_MAX);
  const author = sanitizePlainText(ctx.username, VOX_AUTHOR_MAX);
  const mediaType: MediaType = parsed.mediaType;
  let mediaUrl: string | null = parsed.mediaUrl ?? null;
  let thumbnailUrl: string | null = parsed.thumbnailUrl ?? null;
  const youtubeVideoId: string | null =
    parsed.youtubeVideoId ?? extractYoutubeVideoId(parsed.youtubeUrl ?? "") ?? null;
  if (mediaType === "YOUTUBE") {
    if (!youtubeVideoId) {
      return { ok: false, message: "URL o ID de YouTube inválido", status: 400 };
    }
    thumbnailUrl = youtubeThumbnailUrl(youtubeVideoId, "hq");
    mediaUrl = `https://www.youtube.com/embed/${youtubeVideoId}`;
  } else if (!mediaUrl || !thumbnailUrl) {
    return { ok: false, message: "Faltan URLs de multimedia", status: 400 };
  } else {
    const urlsOk = validateNonYoutubeVoxMediaUrls(mediaUrl, thumbnailUrl);
    if (!urlsOk.ok) {
      return { ok: false, message: urlsOk.message, status: 400 };
    }
  }
  // Only an uploaded video can play as a loop; a YouTube embed or an image cannot.
  const animatedImage = Boolean(parsed.animatedImage && mediaType === "UPLOADED_VIDEO");
  const hasPoll = Boolean(parsed.poll);
  const pollOptions = hasPoll
    ? (parsed
        .poll!.options.map((l) => sanitizePlainText(l, VOX_POLL_OPTION_MAX))
        .filter(Boolean) as string[])
    : [];
  if (hasPoll && (pollOptions.length < 2 || pollOptions.length > 5)) {
    return {
      ok: false,
      message: "La encuesta necesita entre 2 y 5 opciones válidas.",
      status: 400,
    };
  }
  try {
    const postingBlock = await getPostingBlockForUser(ctx.userId, ctx.clientIpRaw);
    if (postingBlock?.kind === "user_ban") {
      return {
        ok: false,
        message: "Tu cuenta está suspendida.",
        status: 403,
        code: "BANNED",
        ban: banToApiPayload(postingBlock.ban),
      };
    }
    if (postingBlock?.kind === "client_network") {
      return {
        ok: false,
        message: "Publicar desde esta conexión no está permitido.",
        status: 403,
        code: "CLIENT_NETWORK_BLOCKED",
        ban: clientIpBanToApiPayload(postingBlock.ban),
      };
    }
    const clientIpHash = hashClientIpFromRawHeaderValue(ctx.clientIpRaw);
    const now = new Date();
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${VOX_CREATE_ADVISORY_LOCK_KEY})`;

        const user = await tx.user.findUnique({
          where: { id: ctx.userId },
          select: { lastVoxAt: true },
        });
        if (!user) {
          throw new Error("no_user");
        }
        if (user.lastVoxAt) {
          const elapsed = now.getTime() - user.lastVoxAt.getTime();
          const remainingMs = VOX_CREATE_INTERVAL_MS - elapsed;
          if (remainingMs > 0) {
            throw new PostingRateLimitError("vox_user", Math.max(1, remainingMs));
          }
        }
        await assertVoxCreateClientIpCooldown(tx, { clientIpHash, now });
        const vox = await tx.vox.create({
          data: {
            title,
            description,
            author,
            category: parsed.category,
            mediaType,
            mediaUrl,
            thumbnailUrl,
            animatedImage,
            youtubeVideoId: mediaType === "YOUTUBE" ? youtubeVideoId : null,
            ownerId: ctx.userId,
            lastActivityAt: now,
            threadUniqueIdsEnabled,
            countryFlagsEnabled,
            hasPoll,
            clientIpHash,
          },
        });
        // Following one's own vox is what enables "new comment on your vox"; the bell silences it.
        await tx.voxFollow.create({ data: { userId: ctx.userId, voxId: vox.id } });
        if (hasPoll) {
          const poll = await tx.voxPoll.create({
            data: { voxId: vox.id },
          });
          await tx.voxPollOption.createMany({
            data: pollOptions.map((label, sortOrder) => ({
              pollId: poll.id,
              sortOrder,
              label,
            })),
          });
        }
        await tx.user.update({
          where: { id: ctx.userId },
          data: {
            lastVoxAt: now,
            mediaUploadWindowStartAt: null,
            mediaUploadCountInWindow: 0,
          },
        });

        const candidateUrls = new Set<string>();
        const evictedActiveIds: string[] = [];

        for (let i = 0; i < EVICT_LOOP_GUARD; i++) {
          const n = await tx.vox.count();
          if (n <= VOX_ACTIVE_DB_CAP) break;

          const victim = await tx.vox.findFirst({
            where: { pinnedAt: null },
            orderBy: [{ lastActivityAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              deletedAt: true,
              mediaType: true,
              mediaUrl: true,
              thumbnailUrl: true,
              comments: { select: { imageUrl: true, videoUrl: true, videoPosterUrl: true } },
            },
          });
          if (!victim) break;

          for (const u of collectManagedUploadUrlsFromVoxSnapshot(victim)) {
            candidateUrls.add(u);
          }
          await tx.vox.delete({ where: { id: victim.id } });
          if (victim.deletedAt === null) evictedActiveIds.push(victim.id);
        }

        return {
          newVoxId: vox.id,
          evictedActiveIds,
          candidateUrls: [...candidateUrls],
        };
      },
      { timeout: 25_000 },
    );

    for (const id of result.evictedActiveIds) invalidateVoxDetailCache(id);

    // Work after the response goes in `after()`: it would otherwise be cut off once the response is sent.
    after(async () => {
      await Promise.allSettled([
        ...result.evictedActiveIds.map((id) => broadcastVoxDeleted(id, "retention")),
        (async () => {
          const item = await getVoxListItemById(result.newVoxId);
          if (item) await broadcastVoxCreated(item);
        })(),
      ]);
      try {
        if (result.candidateUrls.length > 0) {
          await cleanupManagedUploadUrlsIfUnreferenced(result.candidateUrls, prisma);
        }
        const purged = await purgeExpiredSoftDeletes(
          prisma,
          new Date(),
          PURGE_PER_CREATE_BATCH_MAX,
        );
        if (purged.urls.length > 0) {
          await cleanupManagedUploadUrlsIfUnreferenced(purged.urls, prisma);
        }
        await purgeStalePushDevices(prisma, new Date(), PUSH_DEVICE_PURGE_BATCH_MAX);
      } catch {
        /* best-effort: whatever is interrupted resumes on the next create */
      }
    });

    return { ok: true, id: result.newVoxId };
  } catch (e) {
    if (e instanceof PostingRateLimitError) {
      return {
        ok: false,
        message: postingRateLimitUserMessageEs(e.kind, e.remainingMs),
        status: 429,
      };
    }
    if (e instanceof Error) {
      if (e.message.includes("VOXER_CLIENT_IP_PEPPER")) {
        console.error("[vox:create]", e.message);
        return {
          ok: false,
          message: "Servicio no disponible. Probá más tarde.",
          status: 503,
        };
      }
      if (e.message === "no_user") {
        return { ok: false, message: "Sesión inválida", status: 401 };
      }
    }
    return { ok: false, message: "No se pudo crear el vox", status: 500 };
  }
};
