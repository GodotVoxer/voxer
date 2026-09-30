import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import type { ClientIpBan, UserBan } from "@prisma/client";
import { hashClientIpFromRawHeaderValue } from "@/server/http/clientIpHash";
import {
  banToApiPayload,
  clientIpBanToApiPayload,
  getActiveBanForUser,
} from "@/server/moderation/activeBan";
import { getActiveClientIpBanForHash } from "@/server/moderation/activeClientIpBan";

export type PostingBlock =
  | { kind: "user_ban"; ban: UserBan }
  | { kind: "client_network"; ban: ClientIpBan };

export const getPostingBlockForUser = async (
  userId: string,
  rawClientIp: string,
): Promise<PostingBlock | null> => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "ADMIN") return null;
  const [userBan, ipHash] = await Promise.all([
    getActiveBanForUser(userId),
    Promise.resolve(hashClientIpFromRawHeaderValue(rawClientIp)),
  ]);
  if (userBan) return { kind: "user_ban", ban: userBan };
  const ipBan = await getActiveClientIpBanForHash(ipHash);
  if (ipBan) return { kind: "client_network", ban: ipBan };
  return null;
};

const POSTING_BLOCKED_ACCOUNT_MESSAGE_ES = "Tu cuenta está suspendida.";
const POSTING_BLOCKED_NETWORK_MESSAGE_ES = "Publicar desde esta conexión no está permitido.";

/** 403 with the ban's reason and end: whoever is blocked must know why and until when. */
export const postingBlockResponse = (block: PostingBlock): NextResponse =>
  block.kind === "user_ban"
    ? NextResponse.json(
        {
          code: "BANNED" as const,
          error: POSTING_BLOCKED_ACCOUNT_MESSAGE_ES,
          ban: banToApiPayload(block.ban),
        },
        { status: 403 },
      )
    : NextResponse.json(
        {
          code: "CLIENT_NETWORK_BLOCKED" as const,
          error: POSTING_BLOCKED_NETWORK_MESSAGE_ES,
          ban: clientIpBanToApiPayload(block.ban),
        },
        { status: 403 },
      );
