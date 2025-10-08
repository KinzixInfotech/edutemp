/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Stage` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order]` on the table `Stage` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `name` on the `Stage` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."StageName" AS ENUM ('REVIEW', 'TEST_INTERVIEW', 'OFFER', 'ENROLLED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "public"."Stage" DROP CONSTRAINT "Stage_schoolId_fkey";

-- DropIndex
DROP INDEX "public"."Stage_order_idx";

-- DropIndex
DROP INDEX "public"."Stage_schoolId_idx";

-- AlterTable
ALTER TABLE "public"."Stage" ALTER COLUMN "schoolId" DROP NOT NULL,
DROP COLUMN "name",
ADD COLUMN     "name" "public"."StageName" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Stage_name_key" ON "public"."Stage"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_order_key" ON "public"."Stage"("order");

-- AddForeignKey
ALTER TABLE "public"."Stage" ADD CONSTRAINT "Stage_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

