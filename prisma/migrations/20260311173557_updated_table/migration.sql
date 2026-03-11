-- AlterTable
ALTER TABLE "School" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'India',
ADD COLUMN     "onboardingStage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "state" TEXT;
