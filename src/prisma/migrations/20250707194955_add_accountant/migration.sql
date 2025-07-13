-- CreateTable
CREATE TABLE "Accountant" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "certificates" TEXT[],
    "dob" TIMESTAMP(3) NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "Accountant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Accountant_profileId_key" ON "Accountant"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Accountant_email_key" ON "Accountant"("email");

-- AddForeignKey
ALTER TABLE "Accountant" ADD CONSTRAINT "Accountant_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accountant" ADD CONSTRAINT "Accountant_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
