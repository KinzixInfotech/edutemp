/*
  Warnings:

  - A unique constraint covering the columns `[userId,date]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Attendance_userId_date_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_date_key" ON "public"."Attendance"("userId", "date");
