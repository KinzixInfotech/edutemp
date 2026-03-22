-- AlterTable
ALTER TABLE "Homework" ADD COLUMN     "academicYearId" UUID;

-- AlterTable
ALTER TABLE "LibraryTransaction" ADD COLUMN     "academicYearId" UUID;

-- AlterTable
ALTER TABLE "StudentRouteAssignment" ADD COLUMN     "academicYearId" UUID;

-- AlterTable
ALTER TABLE "TimetableEntry" ADD COLUMN     "academicYearId" UUID;

-- CreateIndex
CREATE INDEX "Homework_academicYearId_idx" ON "Homework"("academicYearId");

-- CreateIndex
CREATE INDEX "LibraryTransaction_academicYearId_idx" ON "LibraryTransaction"("academicYearId");

-- CreateIndex
CREATE INDEX "StudentRouteAssignment_academicYearId_idx" ON "StudentRouteAssignment"("academicYearId");

-- CreateIndex
CREATE INDEX "TimetableEntry_academicYearId_idx" ON "TimetableEntry"("academicYearId");

-- AddForeignKey
ALTER TABLE "StudentRouteAssignment" ADD CONSTRAINT "StudentRouteAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryTransaction" ADD CONSTRAINT "LibraryTransaction_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;
