-- AlterTable
ALTER TABLE "HABIT" ADD COLUMN     "areaId" UUID;

-- AlterTable
ALTER TABLE "METRIC" ADD COLUMN     "areaId" UUID;

-- AlterTable
ALTER TABLE "NOTE" ADD COLUMN     "areaId" UUID;

-- CreateIndex
CREATE INDEX "habit_userId_areaId" ON "HABIT"("userId", "areaId");

-- CreateIndex
CREATE INDEX "metric_userId_areaId" ON "METRIC"("userId", "areaId");

-- CreateIndex
CREATE INDEX "note_userId_areaId" ON "NOTE"("userId", "areaId");

-- AddForeignKey
ALTER TABLE "HABIT" ADD CONSTRAINT "HABIT_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AREA"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "METRIC" ADD CONSTRAINT "METRIC_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AREA"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NOTE" ADD CONSTRAINT "NOTE_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AREA"("id") ON DELETE SET NULL ON UPDATE CASCADE;
