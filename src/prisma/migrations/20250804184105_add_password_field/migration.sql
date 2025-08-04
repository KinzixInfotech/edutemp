/*
  Warnings:

  - You are about to drop the column `Status` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the `ClassTeacher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SectionTeacher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Teacher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_SubjectToTeacher` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[schoolCode]` on the table `School` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `capacity` to the `Class` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactNumber` to the `School` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolCode` to the `School` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Section` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LEFT', 'DISABLED', 'BANNED');

-- DropForeignKey
ALTER TABLE "public"."ClassTeacher" DROP CONSTRAINT "ClassTeacher_classId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ClassTeacher" DROP CONSTRAINT "ClassTeacher_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Homework" DROP CONSTRAINT "Homework_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SectionTeacher" DROP CONSTRAINT "SectionTeacher_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SectionTeacher" DROP CONSTRAINT "SectionTeacher_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Teacher" DROP CONSTRAINT "Teacher_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Teacher" DROP CONSTRAINT "Teacher_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_SubjectToTeacher" DROP CONSTRAINT "_SubjectToTeacher_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_SubjectToTeacher" DROP CONSTRAINT "_SubjectToTeacher_B_fkey";

-- DropIndex
DROP INDEX "public"."Class_schoolId_className_key";

-- AlterTable
ALTER TABLE "public"."Class" ADD COLUMN     "capacity" INTEGER NOT NULL,
ADD COLUMN     "supervisorId" TEXT,
ADD COLUMN     "teachingStaffUserId" UUID;

-- AlterTable
ALTER TABLE "public"."School" ADD COLUMN     "contactNumber" TEXT NOT NULL,
ADD COLUMN     "schoolCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Section" ADD COLUMN     "schoolId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "public"."Student" DROP COLUMN "Status";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "name" TEXT,
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "profilePicture" TEXT NOT NULL DEFAULT 'default.png',
ADD COLUMN     "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "schoolId" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."ClassTeacher";

-- DropTable
DROP TABLE "public"."SectionTeacher";

-- DropTable
DROP TABLE "public"."Teacher";

-- DropTable
DROP TABLE "public"."_SubjectToTeacher";

-- DropEnum
DROP TYPE "public"."StudentStatus";

-- CreateTable
CREATE TABLE "public"."MasterAdmin" (
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,

    CONSTRAINT "MasterAdmin_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."TeachingStaff" (
    "userId" UUID NOT NULL,
    "departmentId" INTEGER,
    "employeeId" TEXT NOT NULL,
    "profilePicture" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "age" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "City" TEXT NOT NULL,
    "district" TEXT,
    "state" TEXT,
    "country" TEXT,
    "PostalCode" TEXT,
    "subjectId" INTEGER NOT NULL,

    CONSTRAINT "TeachingStaff_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."Timetable" (
    "id" TEXT NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "teacher" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_SubjectToTeachingStaff" (
    "A" INTEGER NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_SubjectToTeachingStaff_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterAdmin_userId_key" ON "public"."MasterAdmin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MasterAdmin_schoolId_key" ON "public"."MasterAdmin"("schoolId");

-- CreateIndex
CREATE INDEX "TeachingStaff_departmentId_idx" ON "public"."TeachingStaff"("departmentId");

-- CreateIndex
CREATE INDEX "_SubjectToTeachingStaff_B_index" ON "public"."_SubjectToTeachingStaff"("B");

-- CreateIndex
CREATE UNIQUE INDEX "School_schoolCode_key" ON "public"."School"("schoolCode");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MasterAdmin" ADD CONSTRAINT "MasterAdmin_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MasterAdmin" ADD CONSTRAINT "MasterAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeachingStaff" ADD CONSTRAINT "TeachingStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeachingStaff" ADD CONSTRAINT "TeachingStaff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Class" ADD CONSTRAINT "Class_teachingStaffUserId_fkey" FOREIGN KEY ("teachingStaffUserId") REFERENCES "public"."TeachingStaff"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Timetable" ADD CONSTRAINT "Timetable_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Homework" ADD CONSTRAINT "Homework_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."TeachingStaff"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SubjectToTeachingStaff" ADD CONSTRAINT "_SubjectToTeachingStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SubjectToTeachingStaff" ADD CONSTRAINT "_SubjectToTeachingStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."TeachingStaff"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
