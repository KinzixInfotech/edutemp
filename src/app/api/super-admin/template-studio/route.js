import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyRoleAccess } from '@/lib/api-auth';
import { createTemplateVersion, ensureDefaultTemplateCategories, mapMarketplaceTemplate, normalizeMarketplaceLayout } from '@/lib/template-marketplace';
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

export async function GET(request) {
    const auth = await verifyRoleAccess(request, ['SUPER_ADMIN']);
    if (auth.error) return auth.response;

    await ensureDefaultTemplateCategories();
    const rows = await prisma.$queryRaw`
    SELECT t."id", t."name", t."description", t."categoryId", c."name" AS "categoryName",
            c."slug" AS "categorySlug", t."documentType", t."status", t."visibility",
            t."pricing", t."pricePaise", t."isFeatured", t."orientation", t."canvasWidth",
            t."canvasHeight", t."previewImage", t."backgroundAsset", t."layoutConfig",
            t."fieldPlaceholders", t."rendererVersion", t."currentVersionId",
            v."versionNumber" AS "currentVersionNumber", t."publishedAt", t."createdAt", t."updatedAt"
    FROM "MarketplaceTemplate" t
    LEFT JOIN "MarketplaceTemplateCategory" c ON c."id" = t."categoryId"
    LEFT JOIN "TemplateVersion" v ON v."id" = t."currentVersionId"
    ORDER BY t."updatedAt" DESC
`;
    return NextResponse.json(rows.map((row) => mapMarketplaceTemplate(row)));
}

export async function POST(request) {
    const auth = await verifyRoleAccess(request, ['SUPER_ADMIN']);
    if (auth.error) return auth.response;

    await ensureDefaultTemplateCategories();
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
    const documentType = body.documentType || body.categorySlug || 'school-document';

    const [template] = await prisma.$queryRaw`
    INSERT INTO "MarketplaceTemplate" (
        "name", "description", "categoryId", "documentType", "status", "visibility",
        "pricing", "pricePaise", "isFeatured", "orientation", "canvasWidth",
        "canvasHeight", "previewImage", "backgroundAsset", "layoutConfig",
        "fieldPlaceholders", "rendererVersion", "createdById", "publishedAt"
    )
    VALUES (
        ${body.name}, ${body.description || null}, ${body.categoryId || null}::uuid,
        ${documentType}, ${status}, ${visibility}, ${body.pricing || 'free'},
        ${Number(body.pricePaise) || 0}, ${Boolean(body.isFeatured)}, ${layoutConfig.orientation},
        ${layoutConfig.canvasWidth}, ${layoutConfig.canvasHeight}, ${body.previewImage || layoutConfig.backgroundImage || null},
        ${backgroundAssetJson}::jsonb, ${layoutJson}::jsonb,
        ${layoutConfig.mappingPlaceholders}, ${TEMPLATE_RENDERER_VERSION}, ${auth.user.id}::uuid,
        ${status === 'published' ? new Date() : null}
    )
    RETURNING *
`;
    if (status === 'published') {
        const version = await createTemplateVersion({
            templateId: template.id,
            layoutConfig,
            validationReport: validation,
            userId: auth.user.id,
        });
        template.currentVersionId = version.id;
        template.currentVersionNumber = version.versionNumber;
    }
    const mappedTemplate = await getStudioTemplateById(template.id);
    return NextResponse.json(mappedTemplate || template, { status: 201 });
}
