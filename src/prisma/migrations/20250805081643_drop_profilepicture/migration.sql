/*
  Warnings:

  - You are about to drop the column `profilePicture` on the `NonTeachingStaff` table. All the data in the column will be lost.
  - You are about to drop the column `profilePicture` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `profilePicture` on the `TeachingStaff` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."NonTeachingStaff" DROP COLUMN "profilePicture";

-- AlterTable
ALTER TABLE "public"."Student" DROP COLUMN "profilePicture";

-- AlterTable
ALTER TABLE "public"."TeachingStaff" DROP COLUMN "profilePicture";
