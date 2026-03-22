/*
  Warnings:

  - A unique constraint covering the columns `[currentSessionId]` on the table `Student` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'PROMOTED', 'DETAINED', 'ALUMNI', 'DROPOUT', 'TRANSFERRED');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "currentSessionId" UUID;

-- CreateTable
CREATE TABLE "StudentSession" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "classId" INTEGER NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "rollNumber" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "StudentSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentSession_studentId_academicYearId_idx" ON "StudentSession"("studentId", "academicYearId");

-- CreateIndex
CREATE INDEX "StudentSession_academicYearId_idx" ON "StudentSession"("academicYearId");

-- CreateIndex
CREATE INDEX "StudentSession_classId_idx" ON "StudentSession"("classId");

-- CreateIndex
CREATE INDEX "StudentSession_sectionId_idx" ON "StudentSession"("sectionId");

-- CreateIndex
CREATE INDEX "StudentSession_status_idx" ON "StudentSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSession_studentId_academicYearId_key" ON "StudentSession"("studentId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_currentSessionId_key" ON "Student"("currentSessionId");

-- CreateIndex
CREATE INDEX "Student_currentSessionId_idx" ON "Student"("currentSessionId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_currentSessionId_fkey" FOREIGN KEY ("currentSessionId") REFERENCES "StudentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSession" ADD CONSTRAINT "StudentSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSession" ADD CONSTRAINT "StudentSession_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSession" ADD CONSTRAINT "StudentSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSession" ADD CONSTRAINT "StudentSession_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
