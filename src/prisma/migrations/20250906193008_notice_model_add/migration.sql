-- CreateEnum
CREATE TYPE "public"."Audience" AS ENUM ('ALL', 'STUDENTS', 'TEACHERS', 'PARENTS', 'CLASS', 'SECTION');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "public"."FeeStatus" ADD VALUE 'PARTIAL';

-- CreateTable
CREATE TABLE "public"."Notice" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fileUrl" TEXT,
    "audience" "public"."Audience" NOT NULL DEFAULT 'ALL',
    "priority" "public"."Priority" NOT NULL DEFAULT 'NORMAL',
    "status" "public"."Status" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NoticeTarget" (
    "id" UUID NOT NULL,
    "noticeId" UUID NOT NULL,
    "classId" INTEGER,
    "sectionId" INTEGER,

    CONSTRAINT "NoticeTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notice_schoolId_idx" ON "public"."Notice"("schoolId");

-- CreateIndex
CREATE INDEX "Notice_status_idx" ON "public"."Notice"("status");

-- CreateIndex
CREATE INDEX "Notice_priority_idx" ON "public"."Notice"("priority");

-- CreateIndex
CREATE INDEX "Notice_publishedAt_idx" ON "public"."Notice"("publishedAt");

-- CreateIndex
CREATE INDEX "Notice_expiryDate_idx" ON "public"."Notice"("expiryDate");

-- CreateIndex
CREATE INDEX "NoticeTarget_noticeId_idx" ON "public"."NoticeTarget"("noticeId");

-- CreateIndex
CREATE INDEX "NoticeTarget_classId_idx" ON "public"."NoticeTarget"("classId");

-- CreateIndex
CREATE INDEX "NoticeTarget_sectionId_idx" ON "public"."NoticeTarget"("sectionId");

-- AddForeignKey
ALTER TABLE "public"."Notice" ADD CONSTRAINT "Notice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notice" ADD CONSTRAINT "Notice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NoticeTarget" ADD CONSTRAINT "NoticeTarget_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "public"."Notice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NoticeTarget" ADD CONSTRAINT "NoticeTarget_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NoticeTarget" ADD CONSTRAINT "NoticeTarget_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
