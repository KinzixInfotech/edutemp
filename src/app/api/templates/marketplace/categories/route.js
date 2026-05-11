import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccess, verifyRoleAccess } from '@/lib/api-auth';
import { ensureDefaultTemplateCategories, ensureTemplateMarketplaceTables, slugifyTemplateCategory } from '@/lib/template-marketplace';

export async function GET(request) {
    const auth = await verifyAdminAccess(request);
    if (auth.error) return auth.response;

    await ensureDefaultTemplateCategories();
    const categories = await prisma.$queryRaw`
        SELECT "id", "name", "slug", "description", "isActive", "sortOrder", "createdAt", "updatedAt"
        FROM "MarketplaceTemplateCategory"
        WHERE "isActive" = true
        ORDER BY "sortOrder" ASC, "name" ASC
    `;
    return NextResponse.json(categories);
}

export async function POST(request) {
    const auth = await verifyRoleAccess(request, ['SUPER_ADMIN']);
    if (auth.error) return auth.response;

    await ensureTemplateMarketplaceTables();
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

    const slug = slugifyTemplateCategory(body.slug || name);
    const [category] = await prisma.$queryRaw`
        INSERT INTO "MarketplaceTemplateCategory" ("name", "slug", "description", "sortOrder")
        VALUES (${name}, ${slug}, ${body.description || null}, ${Number(body.sortOrder) || 0})
        ON CONFLICT ("slug") DO UPDATE SET
            "name" = EXCLUDED."name",
            "description" = EXCLUDED."description",
            "updatedAt" = CURRENT_TIMESTAMP
        RETURNING "id", "name", "slug", "description", "isActive", "sortOrder", "createdAt", "updatedAt"
    `;
    return NextResponse.json(category, { status: 201 });
}

export async function PUT(request) {
    const auth = await verifyRoleAccess(request, ['SUPER_ADMIN']);
    if (auth.error) return auth.response;

    await ensureTemplateMarketplaceTables();
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Category id is required' }, { status: 400 });

    const [category] = await prisma.$queryRaw`
        UPDATE "MarketplaceTemplateCategory"
        SET "name" = ${String(body.name || '').trim()},
            "description" = ${body.description || null},
            "isActive" = ${body.isActive !== false},
            "sortOrder" = ${Number(body.sortOrder) || 0},
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${body.id}::uuid
        RETURNING "id", "name", "slug", "description", "isActive", "sortOrder", "createdAt", "updatedAt"
    `;
    return NextResponse.json(category);
}
