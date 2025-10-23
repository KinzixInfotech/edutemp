-- AlterTable
ALTER TABLE "public"."StageHistory" ADD COLUMN     "testEndTime" TIMESTAMP(3),
ADD COLUMN     "testPassed" BOOLEAN,
ADD COLUMN     "testStartTime" TIMESTAMP(3),
ADD COLUMN     "testVenue" TEXT;
