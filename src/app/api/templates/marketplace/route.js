import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccess } from '@/lib/api-auth';
import { ensureDefaultTemplateCategories, mapMarketplaceTemplate } from '@/lib/template-marketplace';

export async function GET(request) {
    const auth = await verifyAdminAccess(request);
    if (auth.error) return auth.response;

    await ensureDefaultTemplateCategories();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const pricing = searchParams.get('pricing');
    const schoolId = auth.user?.schoolId;

    const rows = await prisma.$queryRaw`
        SELECT t."id", t."name", t."description", t."categoryId", c."name" AS "categoryName",
               c."slug" AS "categorySlug", t."documentType", t."status", t."visibility",
               t."pricing", t."pricePaise", t."isFeatured", t."orientation", t."canvasWidth",
               t."canvasHeight", t."previewImage", t."backgroundAsset", t."layoutConfig",
               t."fieldPlaceholders", t."rendererVersion", t."currentVersionId",
               v."versionNumber" AS "currentVersionNumber",
               sc."marketplaceTemplateVersionId" AS "schoolCopyVersionId",
               t."publishedAt", t."createdAt", t."updatedAt"
        FROM "MarketplaceTemplate" t
        LEFT JOIN "MarketplaceTemplateCategory" c ON c."id" = t."categoryId"
        LEFT JOIN "TemplateVersion" v ON v."id" = t."currentVersionId"
        LEFT JOIN "SchoolTemplateCopy" sc
          ON sc."marketplaceTemplateId" = t."id"
         AND sc."schoolId" = ${schoolId || null}::uuid
        WHERE t."status" = 'published'
          AND t."visibility" <> 'hidden'
          AND (${category}::text IS NULL OR c."slug" = ${category})
          AND (${pricing}::text IS NULL OR t."pricing" = ${pricing})
        ORDER BY t."isFeatured" DESC, t."publishedAt" DESC NULLS LAST, t."createdAt" DESC
    `;

    let purchasedIds = new Set();
    let copiedIds = new Set();
    if (schoolId) {
        const purchases = await prisma.$queryRaw`
            SELECT "marketplaceTemplateId" FROM "PurchasedTemplate"
            WHERE "schoolId" = ${schoolId}::uuid AND "status" = 'unlocked'
        `;
        const copies = await prisma.$queryRaw`
            SELECT "marketplaceTemplateId" FROM "SchoolTemplateCopy"
            WHERE "schoolId" = ${schoolId}::uuid
        `;
        purchasedIds = new Set(purchases.map((item) => item.marketplaceTemplateId));
        copiedIds = new Set(copies.map((item) => item.marketplaceTemplateId));
    }

    return NextResponse.json(rows.map((row) => mapMarketplaceTemplate(row, purchasedIds, copiedIds)));
}
