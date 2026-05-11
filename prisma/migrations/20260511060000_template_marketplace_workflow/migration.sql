CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "MarketplaceTemplateCategory" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MarketplaceTemplate" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" UUID REFERENCES "MarketplaceTemplateCategory"("id") ON DELETE SET NULL,
    "documentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "visibility" TEXT NOT NULL DEFAULT 'draft',
    "pricing" TEXT NOT NULL DEFAULT 'free',
    "pricePaise" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "orientation" TEXT NOT NULL DEFAULT 'portrait',
    "canvasWidth" INTEGER NOT NULL DEFAULT 794,
    "canvasHeight" INTEGER NOT NULL DEFAULT 1123,
    "previewImage" TEXT,
    "backgroundAsset" JSONB,
    "layoutConfig" JSONB NOT NULL,
    "fieldPlaceholders" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "rendererVersion" TEXT NOT NULL DEFAULT 'fixed-layout-v1',
    "currentVersionId" UUID,
    "createdById" UUID REFERENCES "User"("id") ON DELETE SET NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TemplateVersion" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "marketplaceTemplateId" UUID NOT NULL REFERENCES "MarketplaceTemplate"("id") ON DELETE CASCADE,
    "versionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "layoutConfig" JSONB NOT NULL,
    "fieldPlaceholders" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "rendererVersion" TEXT NOT NULL DEFAULT 'fixed-layout-v1',
    "validationReport" JSONB,
    "createdById" UUID REFERENCES "User"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("marketplaceTemplateId", "versionNumber")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'MarketplaceTemplate_currentVersionId_fkey'
    ) THEN
        ALTER TABLE "MarketplaceTemplate"
            ADD CONSTRAINT "MarketplaceTemplate_currentVersionId_fkey"
            FOREIGN KEY ("currentVersionId") REFERENCES "TemplateVersion"("id") ON DELETE SET NULL;
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "SchoolTemplateCopy" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL REFERENCES "School"("id") ON DELETE CASCADE,
    "marketplaceTemplateId" UUID NOT NULL REFERENCES "MarketplaceTemplate"("id") ON DELETE RESTRICT,
    "marketplaceTemplateVersionId" UUID REFERENCES "TemplateVersion"("id") ON DELETE RESTRICT,
    "name" TEXT NOT NULL,
    "layoutConfig" JSONB NOT NULL,
    "customizations" JSONB,
    "createdById" UUID REFERENCES "User"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("schoolId", "marketplaceTemplateId")
);

CREATE TABLE IF NOT EXISTS "PurchasedTemplate" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL REFERENCES "School"("id") ON DELETE CASCADE,
    "marketplaceTemplateId" UUID NOT NULL REFERENCES "MarketplaceTemplate"("id") ON DELETE RESTRICT,
    "amountPaise" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unlocked',
    "purchasedById" UUID REFERENCES "User"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("schoolId", "marketplaceTemplateId")
);

CREATE INDEX IF NOT EXISTS "MarketplaceTemplate_status_visibility_idx" ON "MarketplaceTemplate"("status", "visibility");
CREATE INDEX IF NOT EXISTS "MarketplaceTemplate_categoryId_idx" ON "MarketplaceTemplate"("categoryId");
CREATE INDEX IF NOT EXISTS "TemplateVersion_marketplaceTemplateId_idx" ON "TemplateVersion"("marketplaceTemplateId");
CREATE INDEX IF NOT EXISTS "SchoolTemplateCopy_schoolId_idx" ON "SchoolTemplateCopy"("schoolId");
CREATE INDEX IF NOT EXISTS "PurchasedTemplate_schoolId_idx" ON "PurchasedTemplate"("schoolId");
