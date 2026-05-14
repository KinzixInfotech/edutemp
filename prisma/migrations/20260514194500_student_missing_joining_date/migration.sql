ALTER TABLE "Student" ALTER COLUMN "admissionDate" DROP NOT NULL;
ALTER TABLE "Student" ADD COLUMN "missingJoiningDate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Student" ADD COLUMN "profileStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
UPDATE "Student" SET "missingJoiningDate" = true, "profileStatus" = 'MISSING_JOIN_DATE' WHERE "admissionDate" IS NULL OR btrim("admissionDate") = '';
CREATE INDEX "Student_schoolId_missingJoiningDate_idx" ON "Student"("schoolId", "missingJoiningDate");
CREATE TABLE "FeeAssignmentHistory" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "academicYearId" UUID,
  "globalFeeStructureId" TEXT,
  "structureName" TEXT,
  "classId" INTEGER,
  "sectionId" INTEGER,
  "assignedBy" UUID,
  "totalRequested" INTEGER NOT NULL DEFAULT 0,
  "assignedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedAlreadyAssigned" INTEGER NOT NULL DEFAULT 0,
  "skippedMissingJoiningDate" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "report" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeeAssignmentHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FeeAssignmentHistory_schoolId_academicYearId_idx" ON "FeeAssignmentHistory"("schoolId", "academicYearId");
CREATE INDEX "FeeAssignmentHistory_createdAt_idx" ON "FeeAssignmentHistory"("createdAt");
