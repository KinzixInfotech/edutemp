-- CreateTable
CREATE TABLE "Librarian" (
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "permissions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Librarian_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Accountant" (
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "permissions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Accountant_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "Librarian_schoolId_idx" ON "Librarian"("schoolId");

-- CreateIndex
CREATE INDEX "Accountant_schoolId_idx" ON "Accountant"("schoolId");

-- AddForeignKey
ALTER TABLE "Librarian" ADD CONSTRAINT "Librarian_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Librarian" ADD CONSTRAINT "Librarian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accountant" ADD CONSTRAINT "Accountant_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accountant" ADD CONSTRAINT "Accountant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
