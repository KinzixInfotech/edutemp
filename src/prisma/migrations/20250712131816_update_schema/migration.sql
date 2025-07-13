/*
  Warnings:

  - You are about to drop the column `childId` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `fatherName` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `motherName` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `profileId` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `profilePhoto` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `schoolId` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `School` table. All the data in the column will be lost.
  - You are about to drop the column `logo` on the `School` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `School` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `School` table. All the data in the column will be lost.
  - You are about to drop the column `class` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `parentIds` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `profilePhoto` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `results` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `teacherId` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `bloodGroup` on the `Teacher` table. All the data in the column will be lost.
  - You are about to drop the column `certificates` on the `Teacher` table. All the data in the column will be lost.
  - You are about to drop the column `class` on the `Teacher` table. All the data in the column will be lost.
  - You are about to drop the column `dob` on the `Teacher` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Teacher` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Teacher` table. All the data in the column will be lost.
  - You are about to drop the column `profileId` on the `Teacher` table. All the data in the column will be lost.
  - You are about to drop the column `profilePhoto` on the `Teacher` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `bloodGroup` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `dob` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `meta` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `mobile` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `profilePhoto` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `schoolId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Accountant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BusDriver` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Employee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LabAssistant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Librarian` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Peon` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Profile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ProfileToUser` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Parent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `School` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[admissionNo]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employeeId]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Parent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `address` to the `School` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `School` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `School` table without a default value. This is not possible if the table is not empty.
  - Made the column `language` on table `School` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `address` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `admissionNo` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classId` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fatherName` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `motherName` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studentName` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `department` to the `Teacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `designation` to the `Teacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employeeId` to the `Teacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `Teacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Teacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MASTERADMIN', 'DIRECTOR', 'ADMIN', 'TEACHING_STAFF', 'STUDENT', 'PARENT', 'NON_TEACHING_STAFF');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'LEAVE');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('PAID', 'PENDING', 'OVERDUE');

-- DropForeignKey
ALTER TABLE "Accountant" DROP CONSTRAINT "Accountant_profileId_fkey";

-- DropForeignKey
ALTER TABLE "Accountant" DROP CONSTRAINT "Accountant_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "BusDriver" DROP CONSTRAINT "BusDriver_profileId_fkey";

-- DropForeignKey
ALTER TABLE "BusDriver" DROP CONSTRAINT "BusDriver_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "LabAssistant" DROP CONSTRAINT "LabAssistant_profileId_fkey";

-- DropForeignKey
ALTER TABLE "LabAssistant" DROP CONSTRAINT "LabAssistant_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Librarian" DROP CONSTRAINT "Librarian_profileId_fkey";

-- DropForeignKey
ALTER TABLE "Librarian" DROP CONSTRAINT "Librarian_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Parent" DROP CONSTRAINT "Parent_childId_fkey";

-- DropForeignKey
ALTER TABLE "Parent" DROP CONSTRAINT "Parent_profileId_fkey";

-- DropForeignKey
ALTER TABLE "Parent" DROP CONSTRAINT "Parent_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Peon" DROP CONSTRAINT "Peon_profileId_fkey";

-- DropForeignKey
ALTER TABLE "Peon" DROP CONSTRAINT "Peon_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "Teacher" DROP CONSTRAINT "Teacher_profileId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "_ProfileToUser" DROP CONSTRAINT "_ProfileToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProfileToUser" DROP CONSTRAINT "_ProfileToUser_B_fkey";

-- DropIndex
DROP INDEX "Parent_profileId_key";

-- DropIndex
DROP INDEX "Teacher_email_key";

-- DropIndex
DROP INDEX "Teacher_profileId_key";

-- AlterTable
ALTER TABLE "Parent" DROP COLUMN "childId",
DROP COLUMN "fatherName",
DROP COLUMN "motherName",
DROP COLUMN "profileId",
DROP COLUMN "profilePhoto",
DROP COLUMN "schoolId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "School" DROP COLUMN "location",
DROP COLUMN "logo",
DROP COLUMN "timezone",
DROP COLUMN "type",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "phone" TEXT NOT NULL,
ALTER COLUMN "currentDomain" DROP NOT NULL,
ALTER COLUMN "customDomain" DROP NOT NULL,
ALTER COLUMN "language" SET NOT NULL,
ALTER COLUMN "language" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "class",
DROP COLUMN "location",
DROP COLUMN "name",
DROP COLUMN "parentIds",
DROP COLUMN "profilePhoto",
DROP COLUMN "results",
DROP COLUMN "teacherId",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "adhaarNo" TEXT,
ADD COLUMN     "admissionNo" TEXT NOT NULL,
ADD COLUMN     "classId" TEXT NOT NULL,
ADD COLUMN     "fatherMobileNumber" TEXT,
ADD COLUMN     "fatherName" TEXT NOT NULL,
ADD COLUMN     "gender" "Gender" NOT NULL,
ADD COLUMN     "guardianMobileNo" TEXT,
ADD COLUMN     "guardianName" TEXT,
ADD COLUMN     "guardianRelation" TEXT,
ADD COLUMN     "motherMobileNumber" TEXT,
ADD COLUMN     "motherName" TEXT NOT NULL,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "session" TEXT NOT NULL,
ADD COLUMN     "studentName" TEXT NOT NULL,
ADD COLUMN     "studentpfp" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "bloodGroup" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Teacher" DROP COLUMN "bloodGroup",
DROP COLUMN "certificates",
DROP COLUMN "class",
DROP COLUMN "dob",
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "profileId",
DROP COLUMN "profilePhoto",
ADD COLUMN     "department" TEXT NOT NULL,
ADD COLUMN     "designation" TEXT NOT NULL,
ADD COLUMN     "employeeId" TEXT NOT NULL,
ADD COLUMN     "gender" "Gender" NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "address",
DROP COLUMN "bloodGroup",
DROP COLUMN "dob",
DROP COLUMN "meta",
DROP COLUMN "mobile",
DROP COLUMN "name",
DROP COLUMN "profilePhoto",
DROP COLUMN "schoolId",
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "role" "Role" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "Accountant";

-- DropTable
DROP TABLE "BusDriver";

-- DropTable
DROP TABLE "Employee";

-- DropTable
DROP TABLE "LabAssistant";

-- DropTable
DROP TABLE "Librarian";

-- DropTable
DROP TABLE "Peon";

-- DropTable
DROP TABLE "Profile";

-- DropTable
DROP TABLE "_ProfileToUser";

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "contact" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentDocument" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacherId" TEXT,
    "staffId" TEXT,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "teacherId" TEXT,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timetable" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "marks" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePayment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "FeeStatus" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryBook" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isbn" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "issuedToId" TEXT,
    "issuedDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),

    CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportRoute" (
    "id" TEXT NOT NULL,
    "routeName" TEXT NOT NULL,
    "driver" TEXT NOT NULL,
    "busNumber" TEXT NOT NULL,

    CONSTRAINT "TransportRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportAssignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stopName" TEXT NOT NULL,

    CONSTRAINT "TransportAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "target" "Role" NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_userId_key" ON "Parent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "School_email_key" ON "School"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_admissionNo_key" ON "Student"("admissionNo");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_employeeId_key" ON "Teacher"("employeeId");

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryBook" ADD CONSTRAINT "LibraryBook_issuedToId_fkey" FOREIGN KEY ("issuedToId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportAssignment" ADD CONSTRAINT "TransportAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportAssignment" ADD CONSTRAINT "TransportAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
