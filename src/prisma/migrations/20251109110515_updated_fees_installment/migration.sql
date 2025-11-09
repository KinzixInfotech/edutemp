-- CreateTable
CREATE TABLE "InstallmentParticular" (
    "id" UUID NOT NULL,
    "installmentId" UUID NOT NULL,
    "particularId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "InstallmentParticular_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstallmentParticular_installmentId_idx" ON "InstallmentParticular"("installmentId");

-- CreateIndex
CREATE INDEX "InstallmentParticular_particularId_idx" ON "InstallmentParticular"("particularId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentParticular_installmentId_particularId_key" ON "InstallmentParticular"("installmentId", "particularId");

-- AddForeignKey
ALTER TABLE "InstallmentParticular" ADD CONSTRAINT "InstallmentParticular_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "StudentFeeInstallment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentParticular" ADD CONSTRAINT "InstallmentParticular_particularId_fkey" FOREIGN KEY ("particularId") REFERENCES "StudentFeeParticular"("id") ON DELETE CASCADE ON UPDATE CASCADE;
