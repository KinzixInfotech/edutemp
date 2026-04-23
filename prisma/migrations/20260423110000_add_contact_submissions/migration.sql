-- CreateEnum
CREATE TYPE "ContactSubmissionStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'CONTACTED', 'RESOLVED', 'SPAM');

-- CreateEnum
CREATE TYPE "ContactEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "role" TEXT,
    "studentCount" TEXT,
    "message" TEXT,
    "demoPreferred" TEXT,
    "source" TEXT NOT NULL DEFAULT 'CONTACT_PAGE',
    "status" "ContactSubmissionStatus" NOT NULL DEFAULT 'NEW',
    "emailStatus" "ContactEmailStatus" NOT NULL DEFAULT 'PENDING',
    "emailSentAt" TIMESTAMP(3),
    "adminNotifiedAt" TIMESTAMP(3),
    "emailProviderId" TEXT,
    "adminEmailProviderId" TEXT,
    "emailError" TEXT,
    "adminNotes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactSubmission_email_idx" ON "ContactSubmission"("email");

-- CreateIndex
CREATE INDEX "ContactSubmission_phone_idx" ON "ContactSubmission"("phone");

-- CreateIndex
CREATE INDEX "ContactSubmission_status_idx" ON "ContactSubmission"("status");

-- CreateIndex
CREATE INDEX "ContactSubmission_emailStatus_idx" ON "ContactSubmission"("emailStatus");

-- CreateIndex
CREATE INDEX "ContactSubmission_submittedAt_idx" ON "ContactSubmission"("submittedAt");

-- CreateIndex
CREATE INDEX "ContactSubmission_dedupeKey_submittedAt_idx" ON "ContactSubmission"("dedupeKey", "submittedAt");
