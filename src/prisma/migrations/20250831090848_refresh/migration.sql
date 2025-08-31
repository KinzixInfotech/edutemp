/*
  Warnings:

  - Added the required column `amount` to the `FeeStructure` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mode` to the `FeeStructure` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `FeeStructure` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."FeeMode" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY');

-- AlterTable
ALTER TABLE "public"."FeeStructure" ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "mode" "public"."FeeMode" NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;
