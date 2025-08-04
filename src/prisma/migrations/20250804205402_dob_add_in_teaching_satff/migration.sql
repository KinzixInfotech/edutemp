/*
  Warnings:

  - Added the required column `dob` to the `TeachingStaff` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."TeachingStaff" ADD COLUMN     "dob" TEXT NOT NULL;
