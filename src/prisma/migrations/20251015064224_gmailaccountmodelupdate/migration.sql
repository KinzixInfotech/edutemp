-- AlterTable
ALTER TABLE "public"."GmailAccount" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "name" TEXT;
