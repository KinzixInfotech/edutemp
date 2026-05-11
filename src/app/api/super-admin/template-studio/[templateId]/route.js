import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyRoleAccess } from '@/lib/api-auth';
import { createTemplateVersion, ensureTemplateMarketplaceTables, mapMarketplaceTemplate, normalizeMarketplaceLayout } from '@/lib/template-marketplace';
import { TEMPLATE_RENDERER_VERSION, validateTemplateLayout } from '@/lib/template-rendering';

async function getStudioTemplateById(templateId) {
    const [row] = await prisma.$queryRaw`
        SELECT t."id", t."name", t."description", t."categoryId", c."name" AS "categoryName",
               c."slug" AS "categorySlug", t."documentType", t."status", t."visibility",
               t."pricing", t."pricePaise", t."isFeatured", t."orientation", t."canvasWidth",
               t."canvasHeight", t."previewImage", t."backgroundAsset", t."layoutConfig",
               t."fieldPlaceholders", t."rendererVersion", t."currentVersionId",
               v."versionNumber" AS "currentVersionNumber", t."publishedAt", t."createdAt", t."updatedAt"
        FROM "MarketplaceTemplate" t
        LEFT JOIN "MarketplaceTemplateCategory" c ON c."id" = t."categoryId"
        LEFT JOIN "TemplateVersion" v ON v."id" = t."currentVersionId"
        WHERE t."id" = ${templateId}::uuid
        LIMIT 1
    `;
    return row ? mapMarketplaceTemplate(row) : null;
}

export async function GET(request, props) {
    const auth = await verifyRoleAccess(request, ['SUPER_ADMIN']);
    if (auth.error) return auth.response;
    const { templateId } = await props.params;

    await ensureTemplateMarketplaceTables();
    const [row] = await prisma.$queryRaw`
        SELECT t."id", t."name", t."description", t."categoryId", c."name" AS "categoryName",
               c."slug" AS "categorySlug", t."documentType", t."status", t."visibility",
               t."pricing", t."pricePaise", t."isFeatured", t."orientation", t."canvasWidth",
               t."canvasHeight", t."previewImage", t."backgroundAsset", t."layoutConfig",
               t."fieldPlaceholders", t."rendererVersion", t."currentVersionId",
               v."versionNumber" AS "currentVersionNumber", t."publishedAt", t."createdAt", t."updatedAt"
        FROM "MarketplaceTemplate" t
        LEFT JOIN "MarketplaceTemplateCategory" c ON c."id" = t."categoryId"
        LEFT JOIN "TemplateVersion" v ON v."id" = t."currentVersionId"
        WHERE t."id" = ${templateId}::uuid
        LIMIT 1
    `;
    if (!row) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    return NextResponse.json(mapMarketplaceTemplate(row));
}

export async function PUT(request, props) {
    const auth = await verifyRoleAccess(request, ['SUPER_ADMIN']);
    if (auth.error) return auth.response;
    const { templateId } = await props.params;
    await ensureTemplateMarketplaceTables();
    const body = await request.json();
    const layoutConfig = normalizeMarketplaceLayout(body.layoutConfig || {});
    const validation = validateTemplateLayout(layoutConfig);
    if (body.publish && !validation.valid) {
        return NextResponse.json({ error: 'Template validation failed', validation }, { status: 400 });
    }
    const layoutJson = JSON.stringify(layoutConfig);
    const backgroundAssetJson = layoutConfig.backgroundAsset ? JSON.stringify(layoutConfig.backgroundAsset) : null;
    const status = body.publish ? 'published' : (body.status || 'draft');
    const visibility = body.visibility || status;

    const [template] = await prisma.$queryRaw`
        UPDATE "MarketplaceTemplate"
        SET "name" = ${body.name},
            "description" = ${body.description || null},
            "categoryId" = ${body.categoryId || null}::uuid,
            "documentType" = ${body.documentType || 'school-document'},
            "status" = ${status},
            "visibility" = ${visibility},
            "pricing" = ${body.pricing || 'free'},
            "pricePaise" = ${Number(body.pricePaise) || 0},
            "isFeatured" = ${Boolean(body.isFeatured)},
            "orientation" = ${layoutConfig.orientation},
            "canvasWidth" = ${layoutConfig.canvasWidth},
            "canvasHeight" = ${layoutConfig.canvasHeight},
            "previewImage" = ${body.previewImage || layoutConfig.backgroundImage || null},
            "backgroundAsset" = ${backgroundAssetJson}::jsonb,
            "layoutConfig" = ${layoutJson}::jsonb,
            "fieldPlaceholders" = ${layoutConfig.mappingPlaceholders},
            "rendererVersion" = ${TEMPLATE_RENDERER_VERSION},
            "publishedAt" = CASE WHEN ${status} = 'published' AND "publishedAt" IS NULL THEN CURRENT_TIMESTAMP ELSE "publishedAt" END,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${templateId}::uuid
        RETURNING *
    `;
    if (status === 'published') {
        const version = await createTemplateVersion({
            templateId,
            layoutConfig,
            validationReport: validation,
            userId: auth.user.id,
        });
        template.currentVersionId = version.id;
        template.currentVersionNumber = version.versionNumber;
    }
    const mappedTemplate = await getStudioTemplateById(templateId);
    return NextResponse.json(mappedTemplate || template);
}

export async function DELETE(request, props) {
    const auth = await verifyRoleAccess(request, ['SUPER_ADMIN']);
    if (auth.error) return auth.response;
    const { templateId } = await props.params;

    await ensureTemplateMarketplaceTables();

    const [template] = await prisma.$queryRaw`
        SELECT "id", "name", "status"
        FROM "MarketplaceTemplate"
        WHERE "id" = ${templateId}::uuid
        LIMIT 1
    `;
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    const [usage] = await prisma.$queryRaw`
        SELECT
            (SELECT COUNT(*)::int FROM "SchoolTemplateCopy" WHERE "marketplaceTemplateId" = ${templateId}::uuid) AS "copyCount",
            (SELECT COUNT(*)::int FROM "PurchasedTemplate" WHERE "marketplaceTemplateId" = ${templateId}::uuid) AS "purchaseCount",
            (SELECT COUNT(*)::int FROM "DocumentGenerationHistory" WHERE "marketplaceTemplateId" = ${templateId}::uuid) AS "historyCount"
    `;

    const hasUsage = Number(usage?.copyCount || 0) > 0
        || Number(usage?.purchaseCount || 0) > 0
        || Number(usage?.historyCount || 0) > 0;

    if (hasUsage) {
        await prisma.$queryRaw`
            UPDATE "MarketplaceTemplate"
            SET "status" = 'hidden',
                "visibility" = 'hidden',
                "isFeatured" = false,
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = ${templateId}::uuid
            RETURNING *
        `;
        const archived = await getStudioTemplateById(templateId);
        return NextResponse.json({
            archived: true,
            template: archived,
            message: 'Template has school usage, so it was hidden instead of permanently deleted.',
        });
    }

    await prisma.$executeRaw`
        UPDATE "MarketplaceTemplate"
        SET "currentVersionId" = NULL
        WHERE "id" = ${templateId}::uuid
    `;
    await prisma.$executeRaw`
        DELETE FROM "TemplateVersion"
        WHERE "marketplaceTemplateId" = ${templateId}::uuid
    `;
    await prisma.$executeRaw`
        DELETE FROM "MarketplaceTemplate"
        WHERE "id" = ${templateId}::uuid
    `;

    return NextResponse.json({ deleted: true, id: templateId });
}
