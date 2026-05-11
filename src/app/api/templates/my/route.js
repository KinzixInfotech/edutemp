import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccess } from '@/lib/api-auth';
import { ensureDefaultTemplateCategories, ensureTemplateMarketplaceTables } from '@/lib/template-marketplace';

function mapTemplateRow(row) {
    const source = row.source || 'marketplace';
    return {
        id: row.id,
        source,
        marketplaceTemplateId: row.marketplaceTemplateId || row.id,
        schoolTemplateCopyId: source === 'school-copy' ? row.id : row.schoolTemplateCopyId || null,
        name: row.name,
        description: row.description,
        category: row.categoryName ? { name: row.categoryName, slug: row.categorySlug } : null,
        documentType: row.documentType || row.categorySlug || 'school-document',
        pricing: row.pricing || 'free',
        orientation: row.orientation,
        canvasWidth: row.canvasWidth,
        canvasHeight: row.canvasHeight,
        previewImage: row.previewImage,
        layoutConfig: row.layoutConfig,
        currentVersionId: row.currentVersionId || row.marketplaceTemplateVersionId || null,
        currentVersionNumber: row.currentVersionNumber || null,
        updateAvailable: Boolean(row.schoolTemplateCopyId && row.currentVersionId && row.schoolCopyVersionId && row.currentVersionId !== row.schoolCopyVersionId),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export async function GET(request) {
    const auth = await verifyAdminAccess(request);
    if (auth.error) return auth.response;

    await ensureDefaultTemplateCategories();
    await ensureTemplateMarketplaceTables();

    const schoolId = auth.user?.schoolId;
    if (!schoolId) return NextResponse.json([]);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const pricing = searchParams.get('pricing') || 'all';
    const orientation = searchParams.get('orientation') || 'all';
    const q = searchParams.get('q') || '';

    const rows = await prisma.$queryRaw`
        WITH unlocked_marketplace AS (
            SELECT
                t."id",
                'marketplace'::text AS "source",
                t."id" AS "marketplaceTemplateId",
                sc."id" AS "schoolTemplateCopyId",
                sc."marketplaceTemplateVersionId" AS "schoolCopyVersionId",
                t."name",
                t."description",
                c."name" AS "categoryName",
                c."slug" AS "categorySlug",
                t."documentType",
                t."pricing",
                t."orientation",
                t."canvasWidth",
                t."canvasHeight",
                t."previewImage",
                t."layoutConfig",
                t."currentVersionId",
                v."versionNumber" AS "currentVersionNumber",
                t."createdAt",
                t."updatedAt"
            FROM "MarketplaceTemplate" t
            LEFT JOIN "MarketplaceTemplateCategory" c ON c."id" = t."categoryId"
            LEFT JOIN "TemplateVersion" v ON v."id" = t."currentVersionId"
            LEFT JOIN "SchoolTemplateCopy" sc
              ON sc."marketplaceTemplateId" = t."id" AND sc."schoolId" = ${schoolId}::uuid
            LEFT JOIN "PurchasedTemplate" p
              ON p."marketplaceTemplateId" = t."id" AND p."schoolId" = ${schoolId}::uuid AND p."status" = 'unlocked'
            WHERE t."status" = 'published'
              AND t."visibility" <> 'hidden'
              AND (t."pricing" <> 'premium' OR p."id" IS NOT NULL)
        ),
        school_copies AS (
            SELECT
                sc."id",
                'school-copy'::text AS "source",
                t."id" AS "marketplaceTemplateId",
                sc."id" AS "schoolTemplateCopyId",
                sc."marketplaceTemplateVersionId" AS "schoolCopyVersionId",
                sc."name",
                t."description",
                c."name" AS "categoryName",
                c."slug" AS "categorySlug",
                t."documentType",
                t."pricing",
                COALESCE(sc."layoutConfig"->>'orientation', t."orientation") AS "orientation",
                COALESCE((sc."layoutConfig"->>'canvasWidth')::int, t."canvasWidth") AS "canvasWidth",
                COALESCE((sc."layoutConfig"->>'canvasHeight')::int, t."canvasHeight") AS "canvasHeight",
                COALESCE(sc."layoutConfig"->>'backgroundImage', t."previewImage") AS "previewImage",
                sc."layoutConfig",
                t."currentVersionId",
                v."versionNumber" AS "currentVersionNumber",
                sc."createdAt",
                sc."updatedAt"
            FROM "SchoolTemplateCopy" sc
            JOIN "MarketplaceTemplate" t ON t."id" = sc."marketplaceTemplateId"
            LEFT JOIN "MarketplaceTemplateCategory" c ON c."id" = t."categoryId"
            LEFT JOIN "TemplateVersion" v ON v."id" = t."currentVersionId"
            WHERE sc."schoolId" = ${schoolId}::uuid
        )
        SELECT * FROM school_copies
        UNION ALL
        SELECT * FROM unlocked_marketplace
        WHERE "schoolTemplateCopyId" IS NULL
        ORDER BY "updatedAt" DESC
    `;

    const filtered = rows
        .map(mapTemplateRow)
        .filter((template) => category === 'all' || template.category?.slug === category)
        .filter((template) => pricing === 'all' || template.pricing === pricing)
        .filter((template) => orientation === 'all' || template.orientation === orientation)
        .filter((template) => !q.trim() || [template.name, template.description, template.category?.name, template.documentType]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q.trim().toLowerCase())));

    return NextResponse.json(filtered);
}
