/*
  Warnings:

  - Added the required column `academicYearId` to the `NonTeachingStaff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academicYearId` to the `TeachingStaff` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."NonTeachingStaff" ADD COLUMN     "academicYearId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "public"."TeachingStaff" ADD COLUMN     "academicYearId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."TeachingStaff" ADD CONSTRAINT "TeachingStaff_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "public"."AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NonTeachingStaff" ADD CONSTRAINT "NonTeachingStaff_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "public"."AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
