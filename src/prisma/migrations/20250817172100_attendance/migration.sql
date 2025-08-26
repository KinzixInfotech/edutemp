/*
  Warnings:

  - A unique constraint covering the columns `[id,schoolId]` on the table `Class` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `status` on the `Attendance` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HOLIDAY');

-- AlterTable
ALTER TABLE "public"."Attendance" DROP COLUMN "status",
ADD COLUMN     "status" "public"."AttendanceStatus" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Class_id_schoolId_key" ON "public"."Class"("id", "schoolId");
