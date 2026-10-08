import { prisma } from "@/server/db/prisma";

const SITE_SETTINGS_ID = "site";

/** `null` while the mode is off. Read on every check so both app instances agree right away. */
export const getTextOnlySince = async (): Promise<Date | null> => {
  const row = await prisma.siteSettings.findUnique({
    where: { id: SITE_SETTINGS_ID },
    select: { textOnlySince: true },
  });
  return row?.textOnlySince ?? null;
};

export const isTextOnlyModeActive = async (): Promise<boolean> =>
  (await getTextOnlySince()) !== null;

export const setTextOnlyMode = async (active: boolean): Promise<Date | null> => {
  const textOnlySince = active ? new Date() : null;
  const row = await prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS_ID },
    create: { id: SITE_SETTINGS_ID, textOnlySince },
    update: { textOnlySince },
    select: { textOnlySince: true },
  });
  return row.textOnlySince;
};
