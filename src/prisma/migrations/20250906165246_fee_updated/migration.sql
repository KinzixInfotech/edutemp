/*
  Warnings:

  - You are about to drop the column `status` on the `StudentFeeParticular` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."StudentFeeParticular" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "public"."StudentFeeStructure" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'UNPAID';
