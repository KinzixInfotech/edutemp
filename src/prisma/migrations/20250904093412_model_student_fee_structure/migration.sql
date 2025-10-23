/*
  Warnings:

  - Added the required column `feeStructureId` to the `StudentFeeStructure` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."StudentFeeStructure" ADD COLUMN     "feeStructureId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."StudentFeeStructure" ADD CONSTRAINT "StudentFeeStructure_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "public"."FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
