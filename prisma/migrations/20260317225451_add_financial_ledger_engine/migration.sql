-- CreateEnum
CREATE TYPE "FeeComponentType" AS ENUM ('MONTHLY', 'ONE_TIME', 'ANNUAL', 'TERM', 'PROMOTION');

-- CreateEnum
CREATE TYPE "FeeComponentCategory" AS ENUM ('FEE_TUITION', 'FEE_TRANSPORT', 'FEE_ACTIVITY', 'FEE_ADMISSION', 'FEE_EXAMINATION', 'FEE_LIBRARY', 'FEE_LABORATORY', 'FEE_SPORTS', 'FEE_HOSTEL', 'FEE_DEVELOPMENT', 'FEE_FINE', 'FEE_MISCELLANEOUS');

-- CreateEnum
CREATE TYPE "LedgerStatus" AS ENUM ('LEDGER_UNPAID', 'LEDGER_PARTIAL', 'LEDGER_PAID', 'LEDGER_WAIVED', 'LEDGER_CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceModule" AS ENUM ('SERVICE_TRANSPORT', 'SERVICE_ACTIVITY', 'SERVICE_HOSTEL', 'SERVICE_CUSTOM');

-- CreateEnum
CREATE TYPE "ChargeTiming" AS ENUM ('CHARGE_SESSION_START', 'CHARGE_ON_ADMISSION', 'CHARGE_ON_PROMOTION', 'CHARGE_MONTHLY');

-- CreateEnum
CREATE TYPE "LedgerAction" AS ENUM ('LEDGER_CREATED', 'LEDGER_UPDATED', 'LEDGER_WAIVED', 'LEDGER_PAID', 'LEDGER_REVERSED', 'LEDGER_DISCOUNT_APPLIED', 'LEDGER_LATE_FEE_APPLIED', 'LEDGER_FROZEN', 'LEDGER_REGENERATED');

-- CreateTable
CREATE TABLE "FeeSession" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "closedBy" UUID,
    "startMonth" TIMESTAMP(3) NOT NULL,
    "endMonth" TIMESTAMP(3) NOT NULL,
    "dueDayOfMonth" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "module" "ServiceModule" NOT NULL DEFAULT 'SERVICE_CUSTOM',
    "monthlyFee" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeComponent" (
    "id" UUID NOT NULL,
    "feeStructureId" UUID NOT NULL,
    "feeSessionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "FeeComponentType" NOT NULL DEFAULT 'MONTHLY',
    "category" "FeeComponentCategory" NOT NULL DEFAULT 'FEE_TUITION',
    "chargeTiming" "ChargeTiming" NOT NULL DEFAULT 'CHARGE_MONTHLY',
    "serviceId" UUID,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "applicableMonths" JSONB,
    "lateFeeRuleId" UUID,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentService" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "overrideAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFeeLedger" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "feeSessionId" UUID NOT NULL,
    "feeComponentId" UUID NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "monthLabel" TEXT NOT NULL,
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION NOT NULL,
    "status" "LedgerStatus" NOT NULL DEFAULT 'LEDGER_UNPAID',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lateFeeCalculatedAt" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentFeeLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LateFeeRule" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FIXED',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "graceDays" INTEGER NOT NULL DEFAULT 15,
    "maxAmount" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LateFeeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "ledgerEntryId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentWallet" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAuditLog" (
    "id" UUID NOT NULL,
    "ledgerEntryId" UUID NOT NULL,
    "action" "LedgerAction" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "doneBy" UUID NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReversal" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "reversedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReversal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeeSession_schoolId_idx" ON "FeeSession"("schoolId");

-- CreateIndex
CREATE INDEX "FeeSession_isActive_idx" ON "FeeSession"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FeeSession_schoolId_academicYearId_key" ON "FeeSession"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "Service_schoolId_idx" ON "Service"("schoolId");

-- CreateIndex
CREATE INDEX "Service_module_idx" ON "Service"("module");

-- CreateIndex
CREATE INDEX "FeeComponent_feeStructureId_idx" ON "FeeComponent"("feeStructureId");

-- CreateIndex
CREATE INDEX "FeeComponent_feeSessionId_idx" ON "FeeComponent"("feeSessionId");

-- CreateIndex
CREATE INDEX "FeeComponent_type_idx" ON "FeeComponent"("type");

-- CreateIndex
CREATE INDEX "FeeComponent_category_idx" ON "FeeComponent"("category");

-- CreateIndex
CREATE INDEX "StudentService_studentId_idx" ON "StudentService"("studentId");

-- CreateIndex
CREATE INDEX "StudentService_serviceId_idx" ON "StudentService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentService_studentId_serviceId_key" ON "StudentService"("studentId", "serviceId");

-- CreateIndex
CREATE INDEX "StudentFeeLedger_studentId_academicYearId_idx" ON "StudentFeeLedger"("studentId", "academicYearId");

-- CreateIndex
CREATE INDEX "StudentFeeLedger_studentId_status_dueDate_idx" ON "StudentFeeLedger"("studentId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "StudentFeeLedger_schoolId_status_dueDate_idx" ON "StudentFeeLedger"("schoolId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "StudentFeeLedger_schoolId_academicYearId_status_idx" ON "StudentFeeLedger"("schoolId", "academicYearId", "status");

-- CreateIndex
CREATE INDEX "StudentFeeLedger_month_idx" ON "StudentFeeLedger"("month");

-- CreateIndex
CREATE INDEX "StudentFeeLedger_dueDate_idx" ON "StudentFeeLedger"("dueDate");

-- CreateIndex
CREATE INDEX "StudentFeeLedger_status_idx" ON "StudentFeeLedger"("status");

-- CreateIndex
CREATE INDEX "StudentFeeLedger_feeSessionId_idx" ON "StudentFeeLedger"("feeSessionId");

-- CreateIndex
CREATE INDEX "StudentFeeLedger_feeComponentId_idx" ON "StudentFeeLedger"("feeComponentId");

-- CreateIndex
CREATE INDEX "LateFeeRule_schoolId_idx" ON "LateFeeRule"("schoolId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_ledgerEntryId_idx" ON "PaymentAllocation"("ledgerEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentWallet_studentId_key" ON "StudentWallet"("studentId");

-- CreateIndex
CREATE INDEX "StudentWallet_schoolId_idx" ON "StudentWallet"("schoolId");

-- CreateIndex
CREATE INDEX "LedgerAuditLog_ledgerEntryId_idx" ON "LedgerAuditLog"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "LedgerAuditLog_doneBy_idx" ON "LedgerAuditLog"("doneBy");

-- CreateIndex
CREATE INDEX "LedgerAuditLog_createdAt_idx" ON "LedgerAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentReversal_paymentId_idx" ON "PaymentReversal"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentReversal_reversedBy_idx" ON "PaymentReversal"("reversedBy");

-- AddForeignKey
ALTER TABLE "FeeSession" ADD CONSTRAINT "FeeSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeSession" ADD CONSTRAINT "FeeSession_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeComponent" ADD CONSTRAINT "FeeComponent_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "GlobalFeeStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeComponent" ADD CONSTRAINT "FeeComponent_feeSessionId_fkey" FOREIGN KEY ("feeSessionId") REFERENCES "FeeSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeComponent" ADD CONSTRAINT "FeeComponent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeComponent" ADD CONSTRAINT "FeeComponent_lateFeeRuleId_fkey" FOREIGN KEY ("lateFeeRuleId") REFERENCES "LateFeeRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentService" ADD CONSTRAINT "StudentService_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentService" ADD CONSTRAINT "StudentService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeLedger" ADD CONSTRAINT "StudentFeeLedger_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeLedger" ADD CONSTRAINT "StudentFeeLedger_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeLedger" ADD CONSTRAINT "StudentFeeLedger_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeLedger" ADD CONSTRAINT "StudentFeeLedger_feeSessionId_fkey" FOREIGN KEY ("feeSessionId") REFERENCES "FeeSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeLedger" ADD CONSTRAINT "StudentFeeLedger_feeComponentId_fkey" FOREIGN KEY ("feeComponentId") REFERENCES "FeeComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LateFeeRule" ADD CONSTRAINT "LateFeeRule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "FeePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "StudentFeeLedger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWallet" ADD CONSTRAINT "StudentWallet_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWallet" ADD CONSTRAINT "StudentWallet_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAuditLog" ADD CONSTRAINT "LedgerAuditLog_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "StudentFeeLedger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAuditLog" ADD CONSTRAINT "LedgerAuditLog_doneBy_fkey" FOREIGN KEY ("doneBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReversal" ADD CONSTRAINT "PaymentReversal_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "FeePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReversal" ADD CONSTRAINT "PaymentReversal_reversedBy_fkey" FOREIGN KEY ("reversedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
