import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccess } from '@/lib/api-auth';
import { ensureTemplateMarketplaceTables } from '@/lib/template-marketplace';
import { normalizeTemplateLayout } from '@/lib/shared-field-resolver';

function mapGenerationTemplate(row) {
    if (!row) return null;
    const layoutConfig = normalizeTemplateLayout(row.layoutConfig || {});
    return {
        id: row.id,
        source: row.source || 'marketplace',
        marketplaceTemplateId: row.marketplaceTemplateId || row.id,
        schoolTemplateCopyId: row.schoolTemplateCopyId || null,
        templateVersionId: row.templateVersionId || row.currentVersionId || null,
        name: row.name,
        description: row.description,
        category: row.categoryName ? { name: row.categoryName, slug: row.categorySlug } : null,
        documentType: row.documentType || row.categorySlug || 'school-document',
        pricing: row.pricing || 'free',
        orientation: layoutConfig.orientation,
        canvasWidth: layoutConfig.canvasWidth,
        canvasHeight: layoutConfig.canvasHeight,
        layoutConfig,
        fieldPlaceholders: row.fieldPlaceholders || layoutConfig.mappingPlaceholders || [],
        currentVersionNumber: row.currentVersionNumber || null,
    };
}

export async function GET(request, props) {
    const auth = await verifyAdminAccess(request);
    if (auth.error) return auth.response;

    await ensureTemplateMarketplaceTables();

    const { templateId } = await props.params;
    const schoolId = auth.user?.schoolId;
    if (!schoolId) return NextResponse.json({ error: 'School context is required' }, { status: 400 });

    const [copy] = await prisma.$queryRaw`
        SELECT
            sc."id",
            'school-copy'::text AS "source",
            t."id" AS "marketplaceTemplateId",
            sc."id" AS "schoolTemplateCopyId",
            sc."marketplaceTemplateVersionId" AS "templateVersionId",
            sc."name",
            t."description",
            c."name" AS "categoryName",
            c."slug" AS "categorySlug",
            t."documentType",
            t."pricing",
            sc."layoutConfig",
            t."fieldPlaceholders",
            v."versionNumber" AS "currentVersionNumber"
        FROM "SchoolTemplateCopy" sc
        JOIN "MarketplaceTemplate" t ON t."id" = sc."marketplaceTemplateId"
        LEFT JOIN "MarketplaceTemplateCategory" c ON c."id" = t."categoryId"
        LEFT JOIN "TemplateVersion" v ON v."id" = sc."marketplaceTemplateVersionId"
        WHERE sc."id" = ${templateId}::uuid
          AND sc."schoolId" = ${schoolId}::uuid
        LIMIT 1
    `;
    if (copy) return NextResponse.json(mapGenerationTemplate(copy));

    const [marketplace] = await prisma.$queryRaw`
        SELECT
            t."id",
            'marketplace'::text AS "source",
            t."id" AS "marketplaceTemplateId",
            NULL::uuid AS "schoolTemplateCopyId",
            t."currentVersionId" AS "templateVersionId",
            t."name",
            t."description",
            c."name" AS "categoryName",
            c."slug" AS "categorySlug",
            t."documentType",
            t."pricing",
            t."layoutConfig",
            t."fieldPlaceholders",
            v."versionNumber" AS "currentVersionNumber",
            p."id" AS "purchaseId"
        FROM "MarketplaceTemplate" t
        LEFT JOIN "MarketplaceTemplateCategory" c ON c."id" = t."categoryId"
        LEFT JOIN "TemplateVersion" v ON v."id" = t."currentVersionId"
        LEFT JOIN "PurchasedTemplate" p
          ON p."marketplaceTemplateId" = t."id"
         AND p."schoolId" = ${schoolId}::uuid
         AND p."status" = 'unlocked'
        WHERE t."id" = ${templateId}::uuid
          AND t."status" = 'published'
          AND t."visibility" <> 'hidden'
        LIMIT 1
    `;

    if (!marketplace) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    if (marketplace.pricing === 'premium' && !marketplace.purchaseId) {
        return NextResponse.json({ error: 'Premium template is locked', requiresPayment: true }, { status: 402 });
    }

    return NextResponse.json(mapGenerationTemplate(marketplace));
}
