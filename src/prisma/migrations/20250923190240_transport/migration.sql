/*
  Warnings:

  - The primary key for the `LibraryBook` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Vehicle` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `number` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the `Transport` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[licensePlate]` on the table `Vehicle` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ISBN` to the `LibraryBook` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `LibraryBook` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publisher` to the `LibraryBook` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `LibraryBook` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `LibraryBook` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `LibraryBook` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `author` on table `LibraryBook` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `capacity` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `licensePlate` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `model` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `Vehicle` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- DropForeignKey
ALTER TABLE "public"."Transport" DROP CONSTRAINT "Transport_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transport" DROP CONSTRAINT "Transport_vehicleId_fkey";

-- AlterTable
ALTER TABLE "public"."LibraryBook" DROP CONSTRAINT "LibraryBook_pkey",
ADD COLUMN     "ISBN" TEXT NOT NULL,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "edition" TEXT,
ADD COLUMN     "fineAmount" DOUBLE PRECISION,
ADD COLUMN     "issuedAt" TIMESTAMP(3),
ADD COLUMN     "issuedToId" UUID,
ADD COLUMN     "publisher" TEXT NOT NULL,
ADD COLUMN     "reservedAt" TIMESTAMP(3),
ADD COLUMN     "reservedById" UUID,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "author" SET NOT NULL,
ADD CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."Vehicle" DROP CONSTRAINT "Vehicle_pkey",
DROP COLUMN "number",
ADD COLUMN     "capacity" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "licensePlate" TEXT NOT NULL,
ADD COLUMN     "maintenanceDue" TIMESTAMP(3),
ADD COLUMN     "model" TEXT NOT NULL,
ADD COLUMN     "schoolId" UUID NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "public"."Transport";

-- CreateTable
CREATE TABLE "public"."AdmissionForm" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FormField" (
    "id" UUID NOT NULL,
    "admissionFormId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "order" INTEGER NOT NULL,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Application" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "admissionFormId" UUID NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantEmail" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentStageId" UUID NOT NULL,
    "createdById" UUID,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApplicationDocument" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Stage" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "requiresTest" BOOLEAN NOT NULL DEFAULT false,
    "requiresInterview" BOOLEAN NOT NULL DEFAULT false,
    "feeRequired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StageHistory" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "movedById" UUID,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "StageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" UUID NOT NULL,
    "applicationId" UUID,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Route" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "stops" JSONB NOT NULL,
    "assignedVehicleId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentRouteAssignment" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentRouteAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleLocation" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Assignment" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "classId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionForm_slug_key" ON "public"."AdmissionForm"("slug");

-- CreateIndex
CREATE INDEX "AdmissionForm_schoolId_idx" ON "public"."AdmissionForm"("schoolId");

-- CreateIndex
CREATE INDEX "AdmissionForm_slug_idx" ON "public"."AdmissionForm"("slug");

-- CreateIndex
CREATE INDEX "FormField_admissionFormId_idx" ON "public"."FormField"("admissionFormId");

-- CreateIndex
CREATE INDEX "Application_schoolId_idx" ON "public"."Application"("schoolId");

-- CreateIndex
CREATE INDEX "Application_admissionFormId_idx" ON "public"."Application"("admissionFormId");

-- CreateIndex
CREATE INDEX "Application_currentStageId_idx" ON "public"."Application"("currentStageId");

-- CreateIndex
CREATE INDEX "Application_submittedAt_idx" ON "public"."Application"("submittedAt");

-- CreateIndex
CREATE INDEX "Application_applicantEmail_idx" ON "public"."Application"("applicantEmail");

-- CreateIndex
CREATE INDEX "ApplicationDocument_applicationId_idx" ON "public"."ApplicationDocument"("applicationId");

-- CreateIndex
CREATE INDEX "Stage_schoolId_idx" ON "public"."Stage"("schoolId");

-- CreateIndex
CREATE INDEX "Stage_order_idx" ON "public"."Stage"("order");

-- CreateIndex
CREATE INDEX "StageHistory_applicationId_idx" ON "public"."StageHistory"("applicationId");

-- CreateIndex
CREATE INDEX "StageHistory_movedAt_idx" ON "public"."StageHistory"("movedAt");

-- CreateIndex
CREATE INDEX "Payment_applicationId_idx" ON "public"."Payment"("applicationId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Route_schoolId_idx" ON "public"."Route"("schoolId");

-- CreateIndex
CREATE INDEX "Route_name_idx" ON "public"."Route"("name");

-- CreateIndex
CREATE INDEX "StudentRouteAssignment_studentId_idx" ON "public"."StudentRouteAssignment"("studentId");

-- CreateIndex
CREATE INDEX "StudentRouteAssignment_routeId_idx" ON "public"."StudentRouteAssignment"("routeId");

-- CreateIndex
CREATE INDEX "VehicleLocation_vehicleId_idx" ON "public"."VehicleLocation"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleLocation_timestamp_idx" ON "public"."VehicleLocation"("timestamp");

-- CreateIndex
CREATE INDEX "Assignment_schoolId_idx" ON "public"."Assignment"("schoolId");

-- CreateIndex
CREATE INDEX "Assignment_classId_idx" ON "public"."Assignment"("classId");

-- CreateIndex
CREATE INDEX "Assignment_dueDate_idx" ON "public"."Assignment"("dueDate");

-- CreateIndex
CREATE INDEX "LibraryBook_status_idx" ON "public"."LibraryBook"("status");

-- CreateIndex
CREATE INDEX "LibraryBook_ISBN_idx" ON "public"."LibraryBook"("ISBN");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_licensePlate_key" ON "public"."Vehicle"("licensePlate");

-- CreateIndex
CREATE INDEX "Vehicle_schoolId_idx" ON "public"."Vehicle"("schoolId");

-- CreateIndex
CREATE INDEX "Vehicle_licensePlate_idx" ON "public"."Vehicle"("licensePlate");

-- AddForeignKey
ALTER TABLE "public"."AdmissionForm" ADD CONSTRAINT "AdmissionForm_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FormField" ADD CONSTRAINT "FormField_admissionFormId_fkey" FOREIGN KEY ("admissionFormId") REFERENCES "public"."AdmissionForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Application" ADD CONSTRAINT "Application_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Application" ADD CONSTRAINT "Application_admissionFormId_fkey" FOREIGN KEY ("admissionFormId") REFERENCES "public"."AdmissionForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Application" ADD CONSTRAINT "Application_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "public"."Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Application" ADD CONSTRAINT "Application_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "public"."Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Stage" ADD CONSTRAINT "Stage_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StageHistory" ADD CONSTRAINT "StageHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "public"."Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StageHistory" ADD CONSTRAINT "StageHistory_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StageHistory" ADD CONSTRAINT "StageHistory_movedById_fkey" FOREIGN KEY ("movedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "public"."Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vehicle" ADD CONSTRAINT "Vehicle_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Route" ADD CONSTRAINT "Route_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Route" ADD CONSTRAINT "Route_assignedVehicleId_fkey" FOREIGN KEY ("assignedVehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentRouteAssignment" ADD CONSTRAINT "StudentRouteAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentRouteAssignment" ADD CONSTRAINT "StudentRouteAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "public"."Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleLocation" ADD CONSTRAINT "VehicleLocation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LibraryBook" ADD CONSTRAINT "LibraryBook_issuedToId_fkey" FOREIGN KEY ("issuedToId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LibraryBook" ADD CONSTRAINT "LibraryBook_reservedById_fkey" FOREIGN KEY ("reservedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
