/*
  Warnings:

  - Added the required column `dob` to the `NonTeachingStaff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `NonTeachingStaff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `TeachingStaff` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."NonTeachingStaff" DROP CONSTRAINT "NonTeachingStaff_departmentId_fkey";

-- AlterTable
ALTER TABLE "public"."NonTeachingStaff" ADD COLUMN     "dob" TEXT NOT NULL,
ADD COLUMN     "schoolId" UUID NOT NULL,
ALTER COLUMN "departmentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."TeachingStaff" ADD COLUMN     "schoolId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."TeachingStaff" ADD CONSTRAINT "TeachingStaff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NonTeachingStaff" ADD CONSTRAINT "NonTeachingStaff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NonTeachingStaff" ADD CONSTRAINT "NonTeachingStaff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
