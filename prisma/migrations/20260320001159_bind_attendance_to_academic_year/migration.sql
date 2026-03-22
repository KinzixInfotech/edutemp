-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "academicYearId" UUID;

-- AlterTable
ALTER TABLE "BulkAttendance" ADD COLUMN     "academicYearId" UUID;

-- CreateIndex
CREATE INDEX "Attendance_schoolId_academicYearId_idx" ON "Attendance"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "BulkAttendance_schoolId_academicYearId_idx" ON "BulkAttendance"("schoolId", "academicYearId");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkAttendance" ADD CONSTRAINT "BulkAttendance_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;
