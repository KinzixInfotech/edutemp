-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "globalSubjectId" INTEGER,
ADD COLUMN     "isOptional" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GlobalSubject" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" TEXT NOT NULL DEFAULT 'CORE',
    "schoolId" UUID NOT NULL,

    CONSTRAINT "GlobalSubject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GlobalSubject_schoolId_idx" ON "GlobalSubject"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSubject_schoolId_name_key" ON "GlobalSubject"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Subject_globalSubjectId_idx" ON "Subject"("globalSubjectId");

-- AddForeignKey
ALTER TABLE "GlobalSubject" ADD CONSTRAINT "GlobalSubject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_globalSubjectId_fkey" FOREIGN KEY ("globalSubjectId") REFERENCES "GlobalSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
