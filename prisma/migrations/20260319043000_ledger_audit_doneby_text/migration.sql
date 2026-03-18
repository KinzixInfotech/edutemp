-- AlterTable: Remove FK constraint and change doneBy to TEXT
ALTER TABLE "LedgerAuditLog" DROP CONSTRAINT IF EXISTS "LedgerAuditLog_doneBy_fkey";
ALTER TABLE "LedgerAuditLog" ALTER COLUMN "doneBy" TYPE TEXT;
