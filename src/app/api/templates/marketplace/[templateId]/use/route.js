import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccess } from '@/lib/api-auth';
import { ensureTemplateMarketplaceTables } from '@/lib/template-marketplace';

export async function POST(request, props) {
    const auth = await verifyAdminAccess(request);
    if (auth.error) return auth.response;
    const { templateId } = await props.params;
    const schoolId = auth.user?.schoolId;
    if (!schoolId) return NextResponse.json({ error: 'School context is required' }, { status: 400 });

    await ensureTemplateMarketplaceTables();
    const [template] = await prisma.$queryRaw`
        SELECT "id", "name", "pricing", "layoutConfig", "currentVersionId"
        FROM "MarketplaceTemplate"
        WHERE "id" = ${templateId}::uuid AND "status" = 'published' AND "visibility" <> 'hidden'
        LIMIT 1
    `;
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    if (template.pricing === 'premium') {
        const [purchase] = await prisma.$queryRaw`
            SELECT "id" FROM "PurchasedTemplate"
            WHERE "schoolId" = ${schoolId}::uuid AND "marketplaceTemplateId" = ${templateId}::uuid AND "status" = 'unlocked'
            LIMIT 1
        `;
        if (!purchase) return NextResponse.json({ error: 'Premium template is locked', requiresPayment: true }, { status: 402 });
    }

    const layoutJson = JSON.stringify(template.layoutConfig);
    const [copy] = await prisma.$queryRaw`
        INSERT INTO "SchoolTemplateCopy" ("schoolId", "marketplaceTemplateId", "marketplaceTemplateVersionId", "name", "layoutConfig", "customizations", "createdById")
        VALUES (${schoolId}::uuid, ${templateId}::uuid, ${template.currentVersionId || null}::uuid, ${template.name}, ${layoutJson}::jsonb, ${JSON.stringify({ allowed: ['logo', 'colors', 'signature', 'field-position'] })}::jsonb, ${auth.user.id}::uuid)
        ON CONFLICT ("schoolId", "marketplaceTemplateId") DO UPDATE SET
            "updatedAt" = CURRENT_TIMESTAMP
        RETURNING "id", "schoolId", "marketplaceTemplateId", "marketplaceTemplateVersionId", "name", "layoutConfig", "customizations", "createdAt", "updatedAt"
    `;

    return NextResponse.json({ copy, message: 'Template copy is ready for this school' }, { status: 201 });
}
