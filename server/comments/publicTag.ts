import { customAlphabet } from "nanoid";
import { prisma } from "@/server/db/prisma";
const tagAlphabet = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);
export const createUniquePublicTag = async (): Promise<string> => {
  for (let attempt = 0; attempt < 32; attempt++) {
    const candidate = tagAlphabet();
    const clash = await prisma.comment.findUnique({
      where: { publicTag: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  throw new Error("Could not generate a unique tag");
};
