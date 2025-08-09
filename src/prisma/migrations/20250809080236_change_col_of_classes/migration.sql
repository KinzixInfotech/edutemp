-- AlterTable
ALTER TABLE "public"."Section" ADD COLUMN     "teachingStaffUserId" UUID;

-- AddForeignKey
ALTER TABLE "public"."Section" ADD CONSTRAINT "Section_teachingStaffUserId_fkey" FOREIGN KEY ("teachingStaffUserId") REFERENCES "public"."TeachingStaff"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
