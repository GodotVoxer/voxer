-- AlterTable
ALTER TABLE "Vox" ADD COLUMN     "threadUniqueIdsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "countryFlagsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasPoll" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "VoxPoll" (
    "id" TEXT NOT NULL,
    "voxId" TEXT NOT NULL,

    CONSTRAINT "VoxPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoxPollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "label" VARCHAR(80) NOT NULL,

    CONSTRAINT "VoxPollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoxPollVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "VoxPollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoxThreadIdentity" (
    "id" TEXT NOT NULL,
    "voxId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "tag" VARCHAR(3) NOT NULL,
    "badgeHue" INTEGER NOT NULL,

    CONSTRAINT "VoxThreadIdentity_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "pollDisclosureOptionId" TEXT,
ADD COLUMN     "countryCode" CHAR(2);

-- CreateIndex
CREATE UNIQUE INDEX "VoxPoll_voxId_key" ON "VoxPoll"("voxId");

-- CreateIndex
CREATE INDEX "VoxPollOption_pollId_idx" ON "VoxPollOption"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "VoxPollOption_pollId_sortOrder_key" ON "VoxPollOption"("pollId", "sortOrder");

-- CreateIndex
CREATE INDEX "VoxPollVote_pollId_idx" ON "VoxPollVote"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "VoxPollVote_userId_pollId_key" ON "VoxPollVote"("userId", "pollId");

-- CreateIndex
CREATE INDEX "VoxThreadIdentity_voxId_idx" ON "VoxThreadIdentity"("voxId");

-- CreateIndex
CREATE UNIQUE INDEX "VoxThreadIdentity_voxId_authorId_key" ON "VoxThreadIdentity"("voxId", "authorId");

-- CreateIndex
CREATE UNIQUE INDEX "VoxThreadIdentity_voxId_tag_key" ON "VoxThreadIdentity"("voxId", "tag");

-- CreateIndex
CREATE INDEX "Comment_pollDisclosureOptionId_idx" ON "Comment"("pollDisclosureOptionId");

-- AddForeignKey
ALTER TABLE "VoxPoll" ADD CONSTRAINT "VoxPoll_voxId_fkey" FOREIGN KEY ("voxId") REFERENCES "Vox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoxPollOption" ADD CONSTRAINT "VoxPollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "VoxPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoxPollVote" ADD CONSTRAINT "VoxPollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoxPollVote" ADD CONSTRAINT "VoxPollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "VoxPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoxPollVote" ADD CONSTRAINT "VoxPollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "VoxPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoxThreadIdentity" ADD CONSTRAINT "VoxThreadIdentity_voxId_fkey" FOREIGN KEY ("voxId") REFERENCES "Vox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoxThreadIdentity" ADD CONSTRAINT "VoxThreadIdentity_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_pollDisclosureOptionId_fkey" FOREIGN KEY ("pollDisclosureOptionId") REFERENCES "VoxPollOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
