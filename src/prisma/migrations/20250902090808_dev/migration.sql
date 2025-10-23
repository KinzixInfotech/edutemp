-- CreateTable
CREATE TABLE "public"."StudentFeeInstallment" (
    "id" UUID NOT NULL,
    "studentFeeParticularId" UUID NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentFeeInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentFeeInstallment_studentFeeParticularId_idx" ON "public"."StudentFeeInstallment"("studentFeeParticularId");

-- AddForeignKey
ALTER TABLE "public"."StudentFeeInstallment" ADD CONSTRAINT "StudentFeeInstallment_studentFeeParticularId_fkey" FOREIGN KEY ("studentFeeParticularId") REFERENCES "public"."StudentFeeParticular"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
