/*
  Warnings:

  - Added the required column `schoolId` to the `BusDriver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `LabAssistant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Librarian` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Parent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Peon` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BusDriver" ADD COLUMN     "schoolId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "schoolId" TEXT;

-- AlterTable
ALTER TABLE "LabAssistant" ADD COLUMN     "schoolId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Librarian" ADD COLUMN     "schoolId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "schoolId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Peon" ADD COLUMN     "schoolId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusDriver" ADD CONSTRAINT "BusDriver_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Librarian" ADD CONSTRAINT "Librarian_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Peon" ADD CONSTRAINT "Peon_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabAssistant" ADD CONSTRAINT "LabAssistant_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
