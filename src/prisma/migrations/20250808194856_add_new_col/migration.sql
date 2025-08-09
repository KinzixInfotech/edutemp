/*
  Warnings:

  - You are about to drop the column `supervisorId` on the `Class` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Class" DROP COLUMN "supervisorId";

-- CreateTable
CREATE TABLE "public"."SectionSubjectTeacher" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "teachingStaffUserId" UUID NOT NULL,

    CONSTRAINT "SectionSubjectTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SectionSubjectTeacher_sectionId_subjectId_key" ON "public"."SectionSubjectTeacher"("sectionId", "subjectId");

-- AddForeignKey
ALTER TABLE "public"."SectionSubjectTeacher" ADD CONSTRAINT "SectionSubjectTeacher_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SectionSubjectTeacher" ADD CONSTRAINT "SectionSubjectTeacher_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SectionSubjectTeacher" ADD CONSTRAINT "SectionSubjectTeacher_teachingStaffUserId_fkey" FOREIGN KEY ("teachingStaffUserId") REFERENCES "public"."TeachingStaff"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
