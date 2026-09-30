/**
 * Removes the legacy plain `User.registrationIp`.
 *
 * - With hash (`--execute`): stores `registrationIpHash` (HMAC with `VOXER_CLIENT_IP_PEPPER`, which must
 *   match the app's) and clears the IP.
 * - Clear only (`--execute --clear-only`): clears the IP without a hash, no pepper needed; those
 *   accounts stop counting toward the per-network account cap.
 *
 *   npm run db:backfill-registration-ip-hash [-- --execute [--clear-only] [--dev]]
 *
 * Dry run by default. `--dev` allows the fixed development pepper.
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const BATCH_SIZE = 500;

const main = async (): Promise<void> => {
  const execute = process.argv.includes("--execute");
  const clearOnly = process.argv.includes("--clear-only");
  const allowDevPepper = process.argv.includes("--dev");
  const pepper = process.env.VOXER_CLIENT_IP_PEPPER?.trim();
  if (execute && !clearOnly && !allowDevPepper && (!pepper || pepper.length < 16)) {
    console.error(
      "VOXER_CLIENT_IP_PEPPER is missing (min. 16 chars). Use the app's value, --clear-only to clear without a hash, or --dev for a local database.",
    );
    process.exit(1);
  }

  const { prisma } = await import("@/server/db/prisma");

  const pending = await prisma.user.count({ where: { registrationIp: { not: null } } });
  console.log(`Users with a plain registration IP: ${pending}`);
  if (!execute) {
    console.log("Dry run: nothing changed. Pass --execute to apply.");
    await prisma.$disconnect();
    return;
  }

  if (clearOnly) {
    const { count } = await prisma.user.updateMany({
      where: { registrationIp: { not: null } },
      data: { registrationIp: null },
    });
    await prisma.$disconnect();
    console.log(
      `Plain IPs cleared: ${count} (no hash: those accounts no longer count toward the per-network cap).`,
    );
    return;
  }

  const { hashClientIpFromRawHeaderValue } = await import("@/server/http/clientIpHash");
  let updated = 0;
  for (;;) {
    const rows = await prisma.user.findMany({
      where: { registrationIp: { not: null } },
      select: { id: true, registrationIp: true },
      take: BATCH_SIZE,
    });
    if (rows.length === 0) break;
    await prisma.$transaction(
      rows.map((row) =>
        prisma.user.update({
          where: { id: row.id },
          data: {
            registrationIpHash: hashClientIpFromRawHeaderValue(row.registrationIp ?? ""),
            registrationIp: null,
          },
        }),
      ),
    );
    updated += rows.length;
    console.log(`Updated: ${updated}/${pending}`);
  }
  await prisma.$disconnect();
  console.log("Done: no plain registration IPs left.");
};

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
