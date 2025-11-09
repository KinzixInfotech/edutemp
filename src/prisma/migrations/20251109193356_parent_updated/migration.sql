/*
  Warnings:

  - Added the required column `gender` to the `Parent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "gender" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" TEXT NOT NULL;
