/**
 * Deletes uploaded media that no vox or comment references anymore: dedupe rows, local files and
 * objects under `uploads/` in the bucket. Dry run unless `--execute` is passed.
 *
 *   npm run storage:purge-orphans [-- --execute]
 *
 * Unlike the automatic sweep, this ignores the grace period that protects attachments of unsent
 * drafts, so run it when nobody is composing.
 */
import "./loadScriptEnv";
import { prisma } from "@/server/db/prisma";
import { runFullOrphanUploadStoragePurge } from "@/server/media/cleanupUnreferencedUploadUrls";

const main = async () => {
  const report = await runFullOrphanUploadStoragePurge({
    execute: process.argv.includes("--execute"),
    log: console.log,
  });
  console.log("Summary:", report);
};

void main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
