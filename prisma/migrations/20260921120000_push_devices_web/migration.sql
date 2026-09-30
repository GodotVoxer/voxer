-- AlterTable
ALTER TABLE "PushDevice" ADD COLUMN     "webAuth" VARCHAR(64),
ADD COLUMN     "webP256dh" VARCHAR(128);
