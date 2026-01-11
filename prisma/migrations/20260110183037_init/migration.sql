/*
  Warnings:

  - A unique constraint covering the columns `[studentId,examId]` on the table `AdmitCard` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `SchoolPublicProfile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `date` to the `ExamHallInvigilator` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endTime` to the `ExamHallInvigilator` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `ExamHallInvigilator` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransportRole" AS ENUM ('DRIVER', 'CONDUCTOR');

-- CreateEnum
CREATE TYPE "HallTicketStatus" AS ENUM ('NOT_ISSUED', 'ISSUED', 'BLOCKED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "MarkStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LOCKED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PaymentGatewayProvider" AS ENUM ('MANUAL', 'ICICI_EAZYPAY', 'SBI_COLLECT', 'HDFC_SMARTHUB', 'AXIS_EASYPAY', 'BILLDESK', 'PAYU', 'RAZORPAY', 'CASHFREE');

-- CreateEnum
CREATE TYPE "SmsTemplateCategory" AS ENUM ('ATTENDANCE', 'FEE_REMINDER', 'OTP', 'NOTICE', 'HOLIDAY', 'GENERAL');

-- CreateEnum
CREATE TYPE "SmsTransactionType" AS ENUM ('RECHARGE', 'USAGE', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "SmsTriggerType" AS ENUM ('ATTENDANCE_ABSENT', 'FEE_DUE_REMINDER', 'FEE_OVERDUE', 'OTP_LOGIN', 'NOTICE_BROADCAST', 'HOLIDAY_ANNOUNCEMENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExamStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "ExamStatus" ADD VALUE 'RESULTS_PENDING';
ALTER TYPE "ExamStatus" ADD VALUE 'RESULTS_PUBLISHED';

-- DropIndex
DROP INDEX "public"."ExamHallInvigilator_examId_hallId_teacherId_key";

-- AlterTable
ALTER TABLE "AcademicYear" ADD COLUMN     "classesConfigured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feesConfigured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "setupComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "studentsPromoted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subjectsConfigured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timetableConfigured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AdmitCard" ADD COLUMN     "attendanceOk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "attendancePercent" DOUBLE PRECISION,
ADD COLUMN     "blockReason" TEXT,
ADD COLUMN     "feeCleared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isEligible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualBlock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overrideAt" TIMESTAMP(3),
ADD COLUMN     "overrideBy" UUID,
ADD COLUMN     "overrideReason" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "status" "HallTicketStatus" NOT NULL DEFAULT 'NOT_ISSUED',
ADD COLUMN     "userId" UUID,
ALTER COLUMN "seatNumber" DROP NOT NULL,
ALTER COLUMN "layoutConfig" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AttendanceConfig" ADD COLUMN     "adminCanApproveLeaves" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "directorCanApproveLeaves" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "directorOverridesAll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "principalCanApproveLeaves" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "principalOverridesAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ExamHallInvigilator" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "role" TEXT DEFAULT 'PRIMARY',
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "subjectId" INTEGER;

-- AlterTable
ALTER TABLE "FeePayment" ADD COLUMN     "bankReference" TEXT,
ADD COLUMN     "reconciledAt" TIMESTAMP(3),
ADD COLUMN     "settlementStatus" TEXT,
ADD COLUMN     "webhookVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "GlobalFeeStructure" ADD COLUMN     "clonedFromId" UUID,
ADD COLUMN     "enableInstallments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "PromotionHistory" ADD COLUMN     "batchId" UUID,
ADD COLUMN     "fromSectionId" INTEGER,
ADD COLUMN     "isRolledBack" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rollbackReason" TEXT,
ADD COLUMN     "rolledBackAt" TIMESTAMP(3),
ADD COLUMN     "rolledBackBy" UUID,
ADD COLUMN     "toSectionId" INTEGER;

-- AlterTable
ALTER TABLE "SchoolPublicProfile" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "TeacherShift" ADD COLUMN     "isOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timetableEntryId" UUID;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "fuelType" TEXT,
ADD COLUMN     "insuranceExpiry" TIMESTAMP(3),
ADD COLUMN     "insuranceNumber" TEXT,
ADD COLUMN     "lastLocationTime" TIMESTAMP(3),
ADD COLUMN     "mileage" DOUBLE PRECISION,
ADD COLUMN     "pucExpiry" TIMESTAMP(3),
ADD COLUMN     "pucNumber" TEXT,
ADD COLUMN     "rcExpiry" TIMESTAMP(3),
ADD COLUMN     "rcNumber" TEXT,
ADD COLUMN     "trackingStatus" TEXT DEFAULT 'OFFLINE';

-- AlterTable
ALTER TABLE "VehicleLocation" ADD COLUMN     "accuracy" DOUBLE PRECISION,
ADD COLUMN     "heading" DOUBLE PRECISION,
ADD COLUMN     "speed" DOUBLE PRECISION,
ADD COLUMN     "transportStaffId" UUID,
ADD COLUMN     "tripId" UUID;

-- CreateTable
CREATE TABLE "ImportHistory" (
    "id" TEXT NOT NULL,
    "schoolId" UUID NOT NULL,
    "module" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "success" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "importedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errors" JSONB,
    "accountsCreated" INTEGER NOT NULL DEFAULT 0,
    "accountsFailed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ImportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportStaff" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "role" "TransportRole" NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "address" TEXT,
    "emergencyContact" TEXT,
    "profilePicture" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleAssignment" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "transportStaffId" UUID NOT NULL,
    "role" "TransportRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteAssignment" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "conductorId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusStop" (
    "id" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "pickupTime" TEXT,
    "dropTime" TEXT,
    "address" TEXT,
    "landmark" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentStopAssignment" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "stopId" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "pickupStop" BOOLEAN NOT NULL DEFAULT true,
    "dropStop" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentStopAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusTrip" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "conductorId" UUID,
    "tripType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusAttendance" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "stopId" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "tripType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markedById" UUID NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "BusAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportFee" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "routeId" UUID,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT NOT NULL,
    "academicYearId" UUID,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTransportFee" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "transportFeeId" UUID NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentTransportFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportFeePayment" (
    "id" UUID NOT NULL,
    "studentTransportFeeId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionId" TEXT,
    "status" TEXT NOT NULL,
    "collectedById" UUID,
    "receiptNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportFeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusRequest" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "parentId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "routeId" UUID,
    "stopId" UUID,
    "requestType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "preferredStop" TEXT,
    "stopLatitude" DOUBLE PRECISION,
    "stopLongitude" DOUBLE PRECISION,
    "reason" TEXT,
    "notes" TEXT,
    "processedById" UUID,
    "processedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceLock" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" UUID,
    "unlockedAt" TIMESTAMP(3),
    "unlockedBy" UUID,
    "unlockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamEvaluator" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" UUID NOT NULL,

    CONSTRAINT "ExamEvaluator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarksSubmission" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "status" "MarkStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedBy" UUID,
    "submittedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" UUID,
    "unlockReason" TEXT,

    CONSTRAINT "MarksSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Director" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "department" TEXT,
    "joinDate" TIMESTAMP(3),
    "payrollApprovalsCount" INTEGER NOT NULL DEFAULT 0,
    "libraryApprovalsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Director_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Principal" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "department" TEXT,
    "joinDate" TIMESTAMP(3),
    "payrollApprovalsCount" INTEGER NOT NULL DEFAULT 0,
    "libraryApprovalsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Principal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSettings" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "admissionNoPrefix" TEXT,
    "employeeIdPrefix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeSettings" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "defaultFeeMode" TEXT NOT NULL DEFAULT 'YEARLY',
    "allowPartialPayment" BOOLEAN NOT NULL DEFAULT true,
    "allowAdvancePayment" BOOLEAN NOT NULL DEFAULT true,
    "installmentFlexible" BOOLEAN NOT NULL DEFAULT true,
    "lateFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lateFeeType" TEXT NOT NULL DEFAULT 'FIXED',
    "lateFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateFeePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 15,
    "autoApplyLateFee" BOOLEAN NOT NULL DEFAULT false,
    "onlinePaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "paymentGateway" TEXT,
    "sandboxMode" BOOLEAN NOT NULL DEFAULT true,
    "showBankDetails" BOOLEAN NOT NULL DEFAULT false,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "accountHolderName" TEXT,
    "branchName" TEXT,
    "upiId" TEXT,
    "bankQrCodeUrl" TEXT,
    "receiptPrefix" TEXT NOT NULL DEFAULT 'REC',
    "receiptTemplate" TEXT NOT NULL DEFAULT 'default',
    "autoGenerateReceipt" BOOLEAN NOT NULL DEFAULT true,
    "showSchoolLogo" BOOLEAN NOT NULL DEFAULT true,
    "receiptFooterText" TEXT,
    "emailReminders" BOOLEAN NOT NULL DEFAULT true,
    "smsReminders" BOOLEAN NOT NULL DEFAULT false,
    "pushReminders" BOOLEAN NOT NULL DEFAULT false,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 7,
    "overdueReminders" BOOLEAN NOT NULL DEFAULT true,
    "overdueReminderInterval" INTEGER NOT NULL DEFAULT 7,
    "siblingDiscountEnabled" BOOLEAN NOT NULL DEFAULT false,
    "siblingDiscountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "earlyPaymentDiscountEnabled" BOOLEAN NOT NULL DEFAULT false,
    "earlyPaymentDiscountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "earlyPaymentDays" INTEGER NOT NULL DEFAULT 10,
    "earlyPaymentDaysMonthly" INTEGER NOT NULL DEFAULT 7,
    "earlyPaymentDaysQuarterly" INTEGER NOT NULL DEFAULT 15,
    "earlyPaymentDaysHalfYearly" INTEGER NOT NULL DEFAULT 30,
    "earlyPaymentDaysYearly" INTEGER NOT NULL DEFAULT 60,
    "staffWardDiscountEnabled" BOOLEAN NOT NULL DEFAULT false,
    "staffWardDiscountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "feePaymentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "parentId" UUID,
    "receiptData" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "pdfGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolPaymentSettings" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "provider" "PaymentGatewayProvider" NOT NULL DEFAULT 'MANUAL',
    "merchantId" TEXT,
    "accessCode" TEXT,
    "secretKey" TEXT,
    "workingKey" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "testMode" BOOLEAN NOT NULL DEFAULT false,
    "successUrl" TEXT,
    "failureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolPaymentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeAuditLog" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "studentFeeId" UUID,
    "studentId" UUID,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "amount" DOUBLE PRECISION,
    "performedBy" UUID,
    "performedByName" TEXT,
    "performedByRole" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsTemplate" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "dltTemplateId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" TEXT[],
    "category" "SmsTemplateCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsWallet" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCredits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usedCredits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "frozenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsWalletTransaction" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "type" "SmsTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsWalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "templateId" UUID,
    "recipients" TEXT[],
    "message" TEXT NOT NULL,
    "status" "SmsStatus" NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "fast2smsId" TEXT,
    "errorMessage" TEXT,
    "sentBy" UUID,
    "trigger" "SmsTriggerType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsTriggerConfig" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "triggerType" "SmsTriggerType" NOT NULL,
    "templateId" UUID,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsTriggerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "costPerSms" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "minPurchase" INTEGER NOT NULL DEFAULT 100,
    "creditPacks" JSONB NOT NULL DEFAULT '[]',
    "whitelistedDomains" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "userRole" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "costUsd" DOUBLE PRECISION,
    "promptHash" TEXT NOT NULL,
    "responseHash" TEXT,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiInsightCache" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "dayType" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInsightCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSettings" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedRoles" TEXT[] DEFAULT ARRAY['SUPER_ADMIN', 'ADMIN']::TEXT[],
    "dailyLimit" INTEGER NOT NULL DEFAULT 1,
    "monthlyTokenLimit" INTEGER,
    "model" TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiActionPolicy" (
    "id" UUID NOT NULL,
    "feature" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiActionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronNotificationLog" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "ruleType" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDailyLimit" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NotificationDailyLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportHistory_schoolId_idx" ON "ImportHistory"("schoolId");

-- CreateIndex
CREATE INDEX "ImportHistory_createdAt_idx" ON "ImportHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TransportStaff_userId_key" ON "TransportStaff"("userId");

-- CreateIndex
CREATE INDEX "TransportStaff_schoolId_idx" ON "TransportStaff"("schoolId");

-- CreateIndex
CREATE INDEX "TransportStaff_role_idx" ON "TransportStaff"("role");

-- CreateIndex
CREATE INDEX "TransportStaff_isActive_idx" ON "TransportStaff"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TransportStaff_schoolId_employeeId_key" ON "TransportStaff"("schoolId", "employeeId");

-- CreateIndex
CREATE INDEX "VehicleAssignment_vehicleId_idx" ON "VehicleAssignment"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleAssignment_transportStaffId_idx" ON "VehicleAssignment"("transportStaffId");

-- CreateIndex
CREATE INDEX "VehicleAssignment_isActive_idx" ON "VehicleAssignment"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleAssignment_vehicleId_transportStaffId_role_key" ON "VehicleAssignment"("vehicleId", "transportStaffId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "RouteAssignment_routeId_key" ON "RouteAssignment"("routeId");

-- CreateIndex
CREATE INDEX "RouteAssignment_schoolId_idx" ON "RouteAssignment"("schoolId");

-- CreateIndex
CREATE INDEX "RouteAssignment_driverId_idx" ON "RouteAssignment"("driverId");

-- CreateIndex
CREATE INDEX "RouteAssignment_isActive_idx" ON "RouteAssignment"("isActive");

-- CreateIndex
CREATE INDEX "BusStop_routeId_idx" ON "BusStop"("routeId");

-- CreateIndex
CREATE INDEX "BusStop_isActive_idx" ON "BusStop"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BusStop_routeId_orderIndex_key" ON "BusStop"("routeId", "orderIndex");

-- CreateIndex
CREATE INDEX "StudentStopAssignment_studentId_idx" ON "StudentStopAssignment"("studentId");

-- CreateIndex
CREATE INDEX "StudentStopAssignment_stopId_idx" ON "StudentStopAssignment"("stopId");

-- CreateIndex
CREATE INDEX "StudentStopAssignment_routeId_idx" ON "StudentStopAssignment"("routeId");

-- CreateIndex
CREATE INDEX "StudentStopAssignment_isActive_idx" ON "StudentStopAssignment"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StudentStopAssignment_studentId_routeId_key" ON "StudentStopAssignment"("studentId", "routeId");

-- CreateIndex
CREATE INDEX "BusTrip_vehicleId_idx" ON "BusTrip"("vehicleId");

-- CreateIndex
CREATE INDEX "BusTrip_routeId_idx" ON "BusTrip"("routeId");

-- CreateIndex
CREATE INDEX "BusTrip_driverId_idx" ON "BusTrip"("driverId");

-- CreateIndex
CREATE INDEX "BusTrip_conductorId_idx" ON "BusTrip"("conductorId");

-- CreateIndex
CREATE INDEX "BusTrip_date_idx" ON "BusTrip"("date");

-- CreateIndex
CREATE INDEX "BusTrip_status_idx" ON "BusTrip"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BusTrip_vehicleId_routeId_tripType_date_key" ON "BusTrip"("vehicleId", "routeId", "tripType", "date");

-- CreateIndex
CREATE INDEX "BusAttendance_studentId_idx" ON "BusAttendance"("studentId");

-- CreateIndex
CREATE INDEX "BusAttendance_tripId_idx" ON "BusAttendance"("tripId");

-- CreateIndex
CREATE INDEX "BusAttendance_stopId_idx" ON "BusAttendance"("stopId");

-- CreateIndex
CREATE INDEX "BusAttendance_markedAt_idx" ON "BusAttendance"("markedAt");

-- CreateIndex
CREATE INDEX "BusAttendance_status_idx" ON "BusAttendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BusAttendance_studentId_tripId_key" ON "BusAttendance"("studentId", "tripId");

-- CreateIndex
CREATE INDEX "TransportFee_schoolId_idx" ON "TransportFee"("schoolId");

-- CreateIndex
CREATE INDEX "TransportFee_routeId_idx" ON "TransportFee"("routeId");

-- CreateIndex
CREATE INDEX "TransportFee_isActive_idx" ON "TransportFee"("isActive");

-- CreateIndex
CREATE INDEX "StudentTransportFee_studentId_idx" ON "StudentTransportFee"("studentId");

-- CreateIndex
CREATE INDEX "StudentTransportFee_transportFeeId_idx" ON "StudentTransportFee"("transportFeeId");

-- CreateIndex
CREATE INDEX "StudentTransportFee_isActive_idx" ON "StudentTransportFee"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StudentTransportFee_studentId_transportFeeId_key" ON "StudentTransportFee"("studentId", "transportFeeId");

-- CreateIndex
CREATE INDEX "TransportFeePayment_studentTransportFeeId_idx" ON "TransportFeePayment"("studentTransportFeeId");

-- CreateIndex
CREATE INDEX "TransportFeePayment_paymentDate_idx" ON "TransportFeePayment"("paymentDate");

-- CreateIndex
CREATE INDEX "TransportFeePayment_status_idx" ON "TransportFeePayment"("status");

-- CreateIndex
CREATE INDEX "BusRequest_studentId_idx" ON "BusRequest"("studentId");

-- CreateIndex
CREATE INDEX "BusRequest_parentId_idx" ON "BusRequest"("parentId");

-- CreateIndex
CREATE INDEX "BusRequest_schoolId_idx" ON "BusRequest"("schoolId");

-- CreateIndex
CREATE INDEX "BusRequest_status_idx" ON "BusRequest"("status");

-- CreateIndex
CREATE INDEX "BusRequest_createdAt_idx" ON "BusRequest"("createdAt");

-- CreateIndex
CREATE INDEX "AttendanceLock_schoolId_idx" ON "AttendanceLock"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceLock_schoolId_month_year_key" ON "AttendanceLock"("schoolId", "month", "year");

-- CreateIndex
CREATE INDEX "ExamEvaluator_teacherId_idx" ON "ExamEvaluator"("teacherId");

-- CreateIndex
CREATE INDEX "ExamEvaluator_examId_idx" ON "ExamEvaluator"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamEvaluator_examId_teacherId_subjectId_classId_key" ON "ExamEvaluator"("examId", "teacherId", "subjectId", "classId");

-- CreateIndex
CREATE INDEX "MarksSubmission_examId_idx" ON "MarksSubmission"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "MarksSubmission_examId_subjectId_classId_key" ON "MarksSubmission"("examId", "subjectId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "Director_userId_key" ON "Director"("userId");

-- CreateIndex
CREATE INDEX "Director_schoolId_idx" ON "Director"("schoolId");

-- CreateIndex
CREATE INDEX "Director_userId_idx" ON "Director"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Principal_userId_key" ON "Principal"("userId");

-- CreateIndex
CREATE INDEX "Principal_schoolId_idx" ON "Principal"("schoolId");

-- CreateIndex
CREATE INDEX "Principal_userId_idx" ON "Principal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolSettings_schoolId_key" ON "SchoolSettings"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolSettings_schoolId_idx" ON "SchoolSettings"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeSettings_schoolId_key" ON "FeeSettings"("schoolId");

-- CreateIndex
CREATE INDEX "FeeSettings_schoolId_idx" ON "FeeSettings"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_receiptNumber_key" ON "Receipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "Receipt_schoolId_idx" ON "Receipt"("schoolId");

-- CreateIndex
CREATE INDEX "Receipt_feePaymentId_idx" ON "Receipt"("feePaymentId");

-- CreateIndex
CREATE INDEX "Receipt_studentId_idx" ON "Receipt"("studentId");

-- CreateIndex
CREATE INDEX "Receipt_receiptNumber_idx" ON "Receipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "Receipt_createdAt_idx" ON "Receipt"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolPaymentSettings_schoolId_key" ON "SchoolPaymentSettings"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolPaymentSettings_schoolId_idx" ON "SchoolPaymentSettings"("schoolId");

-- CreateIndex
CREATE INDEX "FeeAuditLog_schoolId_idx" ON "FeeAuditLog"("schoolId");

-- CreateIndex
CREATE INDEX "FeeAuditLog_studentFeeId_idx" ON "FeeAuditLog"("studentFeeId");

-- CreateIndex
CREATE INDEX "FeeAuditLog_studentId_idx" ON "FeeAuditLog"("studentId");

-- CreateIndex
CREATE INDEX "FeeAuditLog_action_idx" ON "FeeAuditLog"("action");

-- CreateIndex
CREATE INDEX "FeeAuditLog_createdAt_idx" ON "FeeAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SmsTemplate_dltTemplateId_key" ON "SmsTemplate"("dltTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "SmsWallet_schoolId_key" ON "SmsWallet"("schoolId");

-- CreateIndex
CREATE INDEX "SmsWallet_schoolId_idx" ON "SmsWallet"("schoolId");

-- CreateIndex
CREATE INDEX "SmsWalletTransaction_walletId_idx" ON "SmsWalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "SmsWalletTransaction_createdAt_idx" ON "SmsWalletTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "SmsLog_schoolId_createdAt_idx" ON "SmsLog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "SmsLog_status_idx" ON "SmsLog"("status");

-- CreateIndex
CREATE INDEX "SmsTriggerConfig_schoolId_idx" ON "SmsTriggerConfig"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SmsTriggerConfig_schoolId_triggerType_key" ON "SmsTriggerConfig"("schoolId", "triggerType");

-- CreateIndex
CREATE INDEX "AiUsageLog_schoolId_createdAt_idx" ON "AiUsageLog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_userId_idx" ON "AiUsageLog"("userId");

-- CreateIndex
CREATE INDEX "AiUsageLog_feature_idx" ON "AiUsageLog"("feature");

-- CreateIndex
CREATE INDEX "AiInsightCache_schoolId_date_idx" ON "AiInsightCache"("schoolId", "date");

-- CreateIndex
CREATE INDEX "AiInsightCache_expiresAt_idx" ON "AiInsightCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiInsightCache_schoolId_date_feature_key" ON "AiInsightCache"("schoolId", "date", "feature");

-- CreateIndex
CREATE UNIQUE INDEX "AiSettings_schoolId_key" ON "AiSettings"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "AiActionPolicy_feature_key" ON "AiActionPolicy"("feature");

-- CreateIndex
CREATE INDEX "CronNotificationLog_schoolId_sentAt_idx" ON "CronNotificationLog"("schoolId", "sentAt");

-- CreateIndex
CREATE INDEX "CronNotificationLog_userId_ruleType_sentAt_idx" ON "CronNotificationLog"("userId", "ruleType", "sentAt");

-- CreateIndex
CREATE INDEX "CronNotificationLog_sentAt_idx" ON "CronNotificationLog"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "CronNotificationLog_userId_ruleKey_key" ON "CronNotificationLog"("userId", "ruleKey");

-- CreateIndex
CREATE INDEX "NotificationDailyLimit_date_idx" ON "NotificationDailyLimit"("date");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDailyLimit_userId_date_key" ON "NotificationDailyLimit"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AdmitCard_studentId_examId_key" ON "AdmitCard"("studentId", "examId");

-- CreateIndex
CREATE INDEX "ExamHallInvigilator_examId_idx" ON "ExamHallInvigilator"("examId");

-- CreateIndex
CREATE INDEX "ExamHallInvigilator_hallId_idx" ON "ExamHallInvigilator"("hallId");

-- CreateIndex
CREATE INDEX "ExamHallInvigilator_teacherId_idx" ON "ExamHallInvigilator"("teacherId");

-- CreateIndex
CREATE INDEX "ExamHallInvigilator_subjectId_idx" ON "ExamHallInvigilator"("subjectId");

-- CreateIndex
CREATE INDEX "FeePayment_gatewayOrderId_idx" ON "FeePayment"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "FeePayment_settlementStatus_idx" ON "FeePayment"("settlementStatus");

-- CreateIndex
CREATE INDEX "GlobalFeeStructure_status_idx" ON "GlobalFeeStructure"("status");

-- CreateIndex
CREATE INDEX "PromotionHistory_batchId_idx" ON "PromotionHistory"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolPublicProfile_slug_key" ON "SchoolPublicProfile"("slug");

-- CreateIndex
CREATE INDEX "SchoolPublicProfile_slug_idx" ON "SchoolPublicProfile"("slug");

-- CreateIndex
CREATE INDEX "TeacherShift_timetableEntryId_idx" ON "TeacherShift"("timetableEntryId");

-- CreateIndex
CREATE INDEX "VehicleLocation_tripId_idx" ON "VehicleLocation"("tripId");

-- AddForeignKey
ALTER TABLE "ImportHistory" ADD CONSTRAINT "ImportHistory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportHistory" ADD CONSTRAINT "ImportHistory_importedBy_fkey" FOREIGN KEY ("importedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleLocation" ADD CONSTRAINT "VehicleLocation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "BusTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleLocation" ADD CONSTRAINT "VehicleLocation_transportStaffId_fkey" FOREIGN KEY ("transportStaffId") REFERENCES "TransportStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportStaff" ADD CONSTRAINT "TransportStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportStaff" ADD CONSTRAINT "TransportStaff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleAssignment" ADD CONSTRAINT "VehicleAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleAssignment" ADD CONSTRAINT "VehicleAssignment_transportStaffId_fkey" FOREIGN KEY ("transportStaffId") REFERENCES "TransportStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAssignment" ADD CONSTRAINT "RouteAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAssignment" ADD CONSTRAINT "RouteAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAssignment" ADD CONSTRAINT "RouteAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAssignment" ADD CONSTRAINT "RouteAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TransportStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAssignment" ADD CONSTRAINT "RouteAssignment_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "TransportStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusStop" ADD CONSTRAINT "BusStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentStopAssignment" ADD CONSTRAINT "StudentStopAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentStopAssignment" ADD CONSTRAINT "StudentStopAssignment_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "BusStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentStopAssignment" ADD CONSTRAINT "StudentStopAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusTrip" ADD CONSTRAINT "BusTrip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusTrip" ADD CONSTRAINT "BusTrip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusTrip" ADD CONSTRAINT "BusTrip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TransportStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusTrip" ADD CONSTRAINT "BusTrip_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "TransportStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusAttendance" ADD CONSTRAINT "BusAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusAttendance" ADD CONSTRAINT "BusAttendance_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusAttendance" ADD CONSTRAINT "BusAttendance_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "BusStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusAttendance" ADD CONSTRAINT "BusAttendance_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "BusTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusAttendance" ADD CONSTRAINT "BusAttendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "TransportStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportFee" ADD CONSTRAINT "TransportFee_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportFee" ADD CONSTRAINT "TransportFee_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportFee" ADD CONSTRAINT "TransportFee_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTransportFee" ADD CONSTRAINT "StudentTransportFee_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTransportFee" ADD CONSTRAINT "StudentTransportFee_transportFeeId_fkey" FOREIGN KEY ("transportFeeId") REFERENCES "TransportFee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportFeePayment" ADD CONSTRAINT "TransportFeePayment_studentTransportFeeId_fkey" FOREIGN KEY ("studentTransportFeeId") REFERENCES "StudentTransportFee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRequest" ADD CONSTRAINT "BusRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRequest" ADD CONSTRAINT "BusRequest_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRequest" ADD CONSTRAINT "BusRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRequest" ADD CONSTRAINT "BusRequest_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherShift" ADD CONSTRAINT "TeacherShift_timetableEntryId_fkey" FOREIGN KEY ("timetableEntryId") REFERENCES "TimetableEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmitCard" ADD CONSTRAINT "AdmitCard_overrideBy_fkey" FOREIGN KEY ("overrideBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmitCard" ADD CONSTRAINT "AdmitCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLock" ADD CONSTRAINT "AttendanceLock_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLock" ADD CONSTRAINT "AttendanceLock_lockedBy_fkey" FOREIGN KEY ("lockedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLock" ADD CONSTRAINT "AttendanceLock_unlockedBy_fkey" FOREIGN KEY ("unlockedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamHallInvigilator" ADD CONSTRAINT "ExamHallInvigilator_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamEvaluator" ADD CONSTRAINT "ExamEvaluator_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamEvaluator" ADD CONSTRAINT "ExamEvaluator_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeachingStaff"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamEvaluator" ADD CONSTRAINT "ExamEvaluator_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamEvaluator" ADD CONSTRAINT "ExamEvaluator_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarksSubmission" ADD CONSTRAINT "MarksSubmission_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionHistory" ADD CONSTRAINT "PromotionHistory_fromSectionId_fkey" FOREIGN KEY ("fromSectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionHistory" ADD CONSTRAINT "PromotionHistory_toSectionId_fkey" FOREIGN KEY ("toSectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Director" ADD CONSTRAINT "Director_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Director" ADD CONSTRAINT "Director_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Principal" ADD CONSTRAINT "Principal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Principal" ADD CONSTRAINT "Principal_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSettings" ADD CONSTRAINT "SchoolSettings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeSettings" ADD CONSTRAINT "FeeSettings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_feePaymentId_fkey" FOREIGN KEY ("feePaymentId") REFERENCES "FeePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolPaymentSettings" ADD CONSTRAINT "SchoolPaymentSettings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsWallet" ADD CONSTRAINT "SmsWallet_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsWalletTransaction" ADD CONSTRAINT "SmsWalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "SmsWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SmsTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsTriggerConfig" ADD CONSTRAINT "SmsTriggerConfig_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SmsTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInsightCache" ADD CONSTRAINT "AiInsightCache_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSettings" ADD CONSTRAINT "AiSettings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
