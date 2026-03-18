-- DropForeignKey
ALTER TABLE "LedgerAuditLog" DROP CONSTRAINT "LedgerAuditLog_doneBy_fkey";

-- AlterTable
ALTER TABLE "LedgerAuditLog" ALTER COLUMN "doneBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "LedgerAuditLog" ADD CONSTRAINT "LedgerAuditLog_doneBy_fkey" FOREIGN KEY ("doneBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
