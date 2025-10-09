/*
  Warnings:

  - A unique constraint covering the columns `[schoolId,admissionFormId,applicantEmail]` on the table `Application` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[applicationId,stageId]` on the table `StageHistory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Application_admissionFormId_idx";

-- DropIndex
DROP INDEX "public"."Application_applicantEmail_idx";

-- DropIndex
DROP INDEX "public"."Application_currentStageId_idx";

-- DropIndex
DROP INDEX "public"."Application_schoolId_idx";

-- DropIndex
DROP INDEX "public"."Application_submittedAt_idx";

-- AlterTable
ALTER TABLE "public"."StageHistory" ADD COLUMN     "interviewDate" TIMESTAMP(3),
ADD COLUMN     "interviewNotes" TEXT,
ADD COLUMN     "testDate" TIMESTAMP(3),
ADD COLUMN     "testScore" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "Application_schoolId_admissionFormId_applicantEmail_key" ON "public"."Application"("schoolId", "admissionFormId", "applicantEmail");

-- CreateIndex
CREATE UNIQUE INDEX "StageHistory_applicationId_stageId_key" ON "public"."StageHistory"("applicationId", "stageId");
