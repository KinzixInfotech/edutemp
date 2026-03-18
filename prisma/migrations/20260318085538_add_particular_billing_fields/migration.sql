-- AlterTable
ALTER TABLE "GlobalFeeParticular" ADD COLUMN     "applicableMonths" TEXT,
ADD COLUMN     "chargeTiming" TEXT NOT NULL DEFAULT 'SESSION_START',
ADD COLUMN     "lateFeeRuleId" UUID,
ADD COLUMN     "serviceId" UUID,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'MONTHLY';
