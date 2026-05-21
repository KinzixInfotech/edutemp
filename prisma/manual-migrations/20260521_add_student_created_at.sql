-- Add a real creation timestamp to Student.
-- Existing rows are backfilled from the linked User.createdAt where available.

ALTER TABLE "Student"
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3);

UPDATE "Student" AS s
SET "createdAt" = COALESCE(u."createdAt", NOW())
FROM "User" AS u
WHERE s."userId" = u."id"
  AND s."createdAt" IS NULL;

UPDATE "Student"
SET "createdAt" = NOW()
WHERE "createdAt" IS NULL;

ALTER TABLE "Student"
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Student"
ALTER COLUMN "createdAt" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Student_schoolId_createdAt_idx"
ON "Student"("schoolId", "createdAt");
