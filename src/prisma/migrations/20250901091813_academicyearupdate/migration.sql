/*
  Warnings:

  - A unique constraint covering the columns `[schoolId,name]` on the table `AcademicYear` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `schoolId` to the `AcademicYear` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."AcademicYear" ADD COLUMN     "schoolId" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "AcademicYear_schoolId_idx" ON "public"."AcademicYear"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_schoolId_name_key" ON "public"."AcademicYear"("schoolId", "name");

-- AddForeignKey
ALTER TABLE "public"."AcademicYear" ADD CONSTRAINT "AcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
