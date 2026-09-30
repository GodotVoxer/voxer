import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import {
  COMMUNITY_RULES_VERSION,
  RULES_NOT_ACCEPTED_CODE,
  RULES_NOT_ACCEPTED_MESSAGE_ES,
  hasAcceptedCurrentRules,
} from "@/lib/auth/communityRules";

export const acceptedRulesData = (now: Date = new Date()) => ({
  rulesAcceptedVersion: COMMUNITY_RULES_VERSION,
  rulesAcceptedAt: now,
});

export const userHasAcceptedRules = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { rulesAcceptedVersion: true },
  });
  return hasAcceptedCurrentRules(user?.rulesAcceptedVersion);
};

export const acceptCommunityRules = async (userId: string): Promise<boolean> => {
  const { count } = await prisma.user.updateMany({
    where: { id: userId },
    data: acceptedRulesData(),
  });
  return count > 0;
};

export const rulesNotAcceptedResponse = () =>
  NextResponse.json(
    { code: RULES_NOT_ACCEPTED_CODE, error: RULES_NOT_ACCEPTED_MESSAGE_ES },
    { status: 403 },
  );
