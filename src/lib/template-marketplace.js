import crypto from 'crypto';
import Razorpay from 'razorpay';
import prisma from '@/lib/prisma';
import { extractTemplatePlaceholders, normalizeTemplateLayout } from '@/lib/shared-field-resolver';
import { TEMPLATE_RENDERER_VERSION } from '@/lib/template-rendering';

export const DEFAULT_TEMPLATE_CATEGORIES = [
    ['Admit Cards', 'admit-cards'],
    ['Certificates', 'certificates'],
    ['Bonafide Certificate', 'bonafide-certificate'],
    ['Character Certificate', 'character-certificate'],
    ['Transfer Certificate', 'transfer-certificate'],
    ['Migration Certificate', 'migration-certificate'],
    ['Study Certificate', 'study-certificate'],
    ['Experience Certificate', 'experience-certificate'],
    ['Fee Receipts', 'fee-receipts'],
    ['ID Cards', 'id-cards'],
    ['Report Cards', 'report-cards'],
    ['Hall Tickets', 'hall-tickets'],
    ['Exam Seating Slips', 'exam-seating-slips'],
    ['Library Cards', 'library-cards'],
    ['Gate Pass', 'gate-pass'],
    ['Staff ID Cards', 'staff-id-cards'],
];

export function slugifyTemplateCategory(name = '') {
    return String(name)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `category-${Date.now()}`;
}

let marketplaceSchemaReady = false;

async function executeMarketplaceSchema(sql) {
    await prisma.$executeRawUnsafe(sql);
}

async function tryEnablePgCrypto() {
    try {
        await executeMarketplaceSchema('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    } catch (error) {
        console.warn('pgcrypto extension could not be enabled; continuing with existing database UUID support.', error?.message || error);
    }
}

export async function ensureTemplateMarketplaceTables() {
    if (marketplaceSchemaReady) return;

    await tryEnablePgCrypto();

    await executeMarketplaceSchema(`
        CREATE TABLE IF NOT EXISTS "MarketplaceTemplateCategory" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "name" TEXT NOT NULL,
            "slug" TEXT NOT NULL UNIQUE,
            "description" TEXT,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "sortOrder" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await executeMarketplaceSchema(`
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
        )
    `);

    await executeMarketplaceSchema(`
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
        )
    `);

    await executeMarketplaceSchema(`
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
    `);

    await executeMarketplaceSchema(`
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
        )
    `);

    await executeMarketplaceSchema(`
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
        )
    `);

    await executeMarketplaceSchema(`
        CREATE TABLE IF NOT EXISTS "DocumentGenerationHistory" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "schoolId" UUID NOT NULL REFERENCES "School"("id") ON DELETE CASCADE,
            "marketplaceTemplateId" UUID REFERENCES "MarketplaceTemplate"("id") ON DELETE SET NULL,
            "schoolTemplateCopyId" UUID REFERENCES "SchoolTemplateCopy"("id") ON DELETE SET NULL,
            "templateVersionId" UUID REFERENCES "TemplateVersion"("id") ON DELETE SET NULL,
            "templateName" TEXT NOT NULL,
            "documentType" TEXT NOT NULL DEFAULT 'school-document',
            "categoryName" TEXT,
            "generationMode" TEXT NOT NULL DEFAULT 'single',
            "studentId" UUID REFERENCES "Student"("userId") ON DELETE SET NULL,
            "classId" INTEGER,
            "sectionId" INTEGER,
            "generatedById" UUID REFERENCES "User"("id") ON DELETE SET NULL,
            "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "fileUrl" TEXT,
            "zipUrl" TEXT,
            "status" TEXT NOT NULL DEFAULT 'generated',
            "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await executeMarketplaceSchema('CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceTemplateCategory_slug_key" ON "MarketplaceTemplateCategory"("slug")');
    await executeMarketplaceSchema('CREATE INDEX IF NOT EXISTS "MarketplaceTemplate_status_visibility_idx" ON "MarketplaceTemplate"("status", "visibility")');
    await executeMarketplaceSchema('CREATE INDEX IF NOT EXISTS "MarketplaceTemplate_categoryId_idx" ON "MarketplaceTemplate"("categoryId")');
    await executeMarketplaceSchema('CREATE INDEX IF NOT EXISTS "TemplateVersion_marketplaceTemplateId_idx" ON "TemplateVersion"("marketplaceTemplateId")');
    await executeMarketplaceSchema('CREATE INDEX IF NOT EXISTS "SchoolTemplateCopy_schoolId_idx" ON "SchoolTemplateCopy"("schoolId")');
    await executeMarketplaceSchema('CREATE INDEX IF NOT EXISTS "PurchasedTemplate_schoolId_idx" ON "PurchasedTemplate"("schoolId")');
    await executeMarketplaceSchema('CREATE INDEX IF NOT EXISTS "DocumentGenerationHistory_school_created_idx" ON "DocumentGenerationHistory"("schoolId", "createdAt" DESC)');
    await executeMarketplaceSchema('CREATE INDEX IF NOT EXISTS "DocumentGenerationHistory_template_idx" ON "DocumentGenerationHistory"("marketplaceTemplateId", "schoolTemplateCopyId")');
    await executeMarketplaceSchema('CREATE INDEX IF NOT EXISTS "DocumentGenerationHistory_student_idx" ON "DocumentGenerationHistory"("studentId")');

    marketplaceSchemaReady = true;
}

export async function ensureDefaultTemplateCategories() {
    await ensureTemplateMarketplaceTables();
    for (let index = 0; index < DEFAULT_TEMPLATE_CATEGORIES.length; index += 1) {
        const [name, slug] = DEFAULT_TEMPLATE_CATEGORIES[index];
        await prisma.$executeRaw`
            INSERT INTO "MarketplaceTemplateCategory" ("name", "slug", "sortOrder")
            VALUES (${name}, ${slug}, ${index})
            ON CONFLICT ("slug") DO NOTHING
        `;
    }
}

export function normalizeMarketplaceLayout(layoutConfig = {}) {
    const stableLayout = normalizeTemplateLayout(layoutConfig);
    return {
        ...stableLayout,
        mappingPlaceholders: extractTemplatePlaceholders(stableLayout.elements),
    };
}

export function mapMarketplaceTemplate(row, purchasedIds = new Set(), copiedIds = new Set()) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        categoryId: row.categoryId,
        category: row.categoryName ? { id: row.categoryId, name: row.categoryName, slug: row.categorySlug } : null,
        documentType: row.documentType,
        status: row.status,
        visibility: row.visibility,
        pricing: row.pricing,
        pricePaise: row.pricePaise,
        isFeatured: row.isFeatured,
        orientation: row.orientation,
        canvasWidth: row.canvasWidth,
        canvasHeight: row.canvasHeight,
        previewImage: row.previewImage,
        backgroundAsset: row.backgroundAsset,
        layoutConfig: row.layoutConfig,
        fieldPlaceholders: row.fieldPlaceholders || [],
        rendererVersion: row.rendererVersion || TEMPLATE_RENDERER_VERSION,
        currentVersionId: row.currentVersionId,
        currentVersionNumber: row.currentVersionNumber || null,
        schoolCopyVersionId: row.schoolCopyVersionId || null,
        updateAvailable: Boolean(row.schoolCopyVersionId && row.currentVersionId && row.schoolCopyVersionId !== row.currentVersionId),
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        isUnlocked: row.pricing !== 'premium' || purchasedIds.has(row.id),
        hasSchoolCopy: copiedIds.has(row.id),
    };
}

export async function createTemplateVersion({ templateId, layoutConfig, validationReport, userId }) {
    await ensureTemplateMarketplaceTables();
    const stableLayout = normalizeMarketplaceLayout(layoutConfig);
    const layoutJson = JSON.stringify(stableLayout);
    const validationJson = JSON.stringify(validationReport || {});
    const [version] = await prisma.$queryRaw`
        INSERT INTO "TemplateVersion" (
            "marketplaceTemplateId", "versionNumber", "layoutConfig", "fieldPlaceholders",
            "rendererVersion", "validationReport", "createdById"
        )
        VALUES (
            ${templateId}::uuid,
            COALESCE((SELECT MAX("versionNumber") + 1 FROM "TemplateVersion" WHERE "marketplaceTemplateId" = ${templateId}::uuid), 1),
            ${layoutJson}::jsonb,
            ${stableLayout.mappingPlaceholders},
            ${TEMPLATE_RENDERER_VERSION},
            ${validationJson}::jsonb,
            ${userId || null}::uuid
        )
        RETURNING "id", "versionNumber"
    `;
    await prisma.$executeRaw`
        UPDATE "MarketplaceTemplate"
        SET "currentVersionId" = ${version.id}::uuid,
            "rendererVersion" = ${TEMPLATE_RENDERER_VERSION},
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${templateId}::uuid
    `;
    return version;
}

export function getRazorpayClient() {
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay keys are not configured');
    }
    return new Razorpay({
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) return false;
    const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
    return expected === signature;
}
