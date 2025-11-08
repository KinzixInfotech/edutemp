-- CreateEnum
CREATE TYPE "ParentRelationType" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'GRANDFATHER', 'GRANDMOTHER', 'UNCLE', 'AUNT', 'SIBLING', 'OTHER');

-- CreateTable
CREATE TABLE "Parent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "alternateNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "occupation" TEXT,
    "qualification" TEXT,
    "annualIncome" TEXT,
    "bloodGroup" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactNumber" TEXT,
    "emergencyContactRelation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentParentLink" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "parentId" UUID NOT NULL,
    "relation" "ParentRelationType" NOT NULL DEFAULT 'GUARDIAN',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "canPickup" BOOLEAN NOT NULL DEFAULT true,
    "canViewReports" BOOLEAN NOT NULL DEFAULT true,
    "canViewFees" BOOLEAN NOT NULL DEFAULT true,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedBy" UUID,
    "verifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StudentParentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Parent_userId_key" ON "Parent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_email_key" ON "Parent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_contactNumber_key" ON "Parent"("contactNumber");

-- CreateIndex
CREATE INDEX "Parent_schoolId_idx" ON "Parent"("schoolId");

-- CreateIndex
CREATE INDEX "Parent_contactNumber_idx" ON "Parent"("contactNumber");

-- CreateIndex
CREATE INDEX "Parent_email_idx" ON "Parent"("email");

-- CreateIndex
CREATE INDEX "Parent_userId_idx" ON "Parent"("userId");

-- CreateIndex
CREATE INDEX "StudentParentLink_studentId_idx" ON "StudentParentLink"("studentId");

-- CreateIndex
CREATE INDEX "StudentParentLink_parentId_idx" ON "StudentParentLink"("parentId");

-- CreateIndex
CREATE INDEX "StudentParentLink_relation_idx" ON "StudentParentLink"("relation");

-- CreateIndex
CREATE UNIQUE INDEX "StudentParentLink_studentId_parentId_key" ON "StudentParentLink"("studentId", "parentId");

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentParentLink" ADD CONSTRAINT "StudentParentLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentParentLink" ADD CONSTRAINT "StudentParentLink_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
