-- CreateTable
CREATE TABLE "public"."CertificateTemplate" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "schoolId" UUID NOT NULL,
    "layoutConfig" JSONB NOT NULL,
    "createdById" UUID,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CertificateGenerated" (
    "id" UUID NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "templateId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "issuedById" UUID,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customFields" JSONB NOT NULL,
    "fileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificateGenerated_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DigitalIdCard" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID,
    "qrCodeUrl" TEXT,
    "layoutConfig" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitalIdCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdmitCard" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "examId" INTEGER NOT NULL,
    "schoolId" UUID NOT NULL,
    "seatNumber" TEXT NOT NULL,
    "center" TEXT,
    "layoutConfig" JSONB NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdmitCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CertificateTemplate_schoolId_idx" ON "public"."CertificateTemplate"("schoolId");

-- CreateIndex
CREATE INDEX "CertificateTemplate_type_idx" ON "public"."CertificateTemplate"("type");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateGenerated_certificateNumber_key" ON "public"."CertificateGenerated"("certificateNumber");

-- CreateIndex
CREATE INDEX "CertificateGenerated_schoolId_idx" ON "public"."CertificateGenerated"("schoolId");

-- CreateIndex
CREATE INDEX "CertificateGenerated_studentId_idx" ON "public"."CertificateGenerated"("studentId");

-- CreateIndex
CREATE INDEX "CertificateGenerated_templateId_idx" ON "public"."CertificateGenerated"("templateId");

-- CreateIndex
CREATE INDEX "CertificateGenerated_status_idx" ON "public"."CertificateGenerated"("status");

-- CreateIndex
CREATE INDEX "DigitalIdCard_schoolId_idx" ON "public"."DigitalIdCard"("schoolId");

-- CreateIndex
CREATE INDEX "DigitalIdCard_studentId_idx" ON "public"."DigitalIdCard"("studentId");

-- CreateIndex
CREATE INDEX "AdmitCard_schoolId_idx" ON "public"."AdmitCard"("schoolId");

-- CreateIndex
CREATE INDEX "AdmitCard_studentId_idx" ON "public"."AdmitCard"("studentId");

-- CreateIndex
CREATE INDEX "AdmitCard_examId_idx" ON "public"."AdmitCard"("examId");

-- AddForeignKey
ALTER TABLE "public"."CertificateTemplate" ADD CONSTRAINT "CertificateTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CertificateTemplate" ADD CONSTRAINT "CertificateTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CertificateGenerated" ADD CONSTRAINT "CertificateGenerated_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."CertificateTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CertificateGenerated" ADD CONSTRAINT "CertificateGenerated_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CertificateGenerated" ADD CONSTRAINT "CertificateGenerated_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CertificateGenerated" ADD CONSTRAINT "CertificateGenerated_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DigitalIdCard" ADD CONSTRAINT "DigitalIdCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DigitalIdCard" ADD CONSTRAINT "DigitalIdCard_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DigitalIdCard" ADD CONSTRAINT "DigitalIdCard_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "public"."AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdmitCard" ADD CONSTRAINT "AdmitCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdmitCard" ADD CONSTRAINT "AdmitCard_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdmitCard" ADD CONSTRAINT "AdmitCard_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
