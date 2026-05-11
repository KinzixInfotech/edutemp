import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { verifyAdminAccess } from '@/lib/api-auth';
import { ensureTemplateMarketplaceTables } from '@/lib/template-marketplace';

function mapHistoryRow(row) {
    return {
        id: row.id,
        templateId: row.schoolTemplateCopyId || row.marketplaceTemplateId,
        marketplaceTemplateId: row.marketplaceTemplateId,
        schoolTemplateCopyId: row.schoolTemplateCopyId,
        templateVersionId: row.templateVersionId,
        templateName: row.templateName,
        documentType: row.documentType,
        categoryName: row.categoryName,
        generationMode: row.generationMode,
        student: row.studentId ? {
            id: row.studentId,
            name: row.studentName,
            rollNumber: row.rollNumber,
            admissionNo: row.admissionNo,
            className: row.className,
            sectionName: row.sectionName,
            profilePicture: row.profilePicture,
        } : null,
        generatedBy: row.generatedById ? {
            id: row.generatedById,
            name: row.generatedByName,
        } : null,
        issueDate: row.issueDate,
        fileUrl: row.fileUrl,
        zipUrl: row.zipUrl,
        status: row.status,
        metadata: row.metadata || {},
        createdAt: row.createdAt,
    };
}

export async function GET(request, props) {
    const params = await props.params;
    const { schoolId } = params;
    const auth = await verifyAdminAccess(request, schoolId);
    if (auth.error) return auth.response;
    const { searchParams } = new URL(request.url);

    await ensureTemplateMarketplaceTables();

    const limit = Math.min(Number(searchParams.get('limit')) || 30, 100);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || 'all';
    const mode = searchParams.get('mode') || 'all';
    const templateId = searchParams.get('templateId') || 'all';

    const rows = await prisma.$queryRaw`
        SELECT
            h."id",
            h."marketplaceTemplateId",
            h."schoolTemplateCopyId",
            h."templateVersionId",
            h."templateName",
            h."documentType",
            h."categoryName",
            h."generationMode",
            h."studentId",
            s."name" AS "studentName",
            s."rollNumber",
            s."admissionNo",
            cl."className",
            sec."name" AS "sectionName",
            su."profilePicture",
            h."generatedById",
            gu."name" AS "generatedByName",
            h."issueDate",
            h."fileUrl",
            h."zipUrl",
            h."status",
            h."metadata",
            h."createdAt"
        FROM "DocumentGenerationHistory" h
        LEFT JOIN "Student" s ON s."userId" = h."studentId"
        LEFT JOIN "User" su ON su."id" = s."userId"
        LEFT JOIN "Class" cl ON cl."id" = COALESCE(h."classId", s."classId")
        LEFT JOIN "Section" sec ON sec."id" = COALESCE(h."sectionId", s."sectionId")
        LEFT JOIN "User" gu ON gu."id" = h."generatedById"
        WHERE h."schoolId" = ${schoolId}::uuid
          AND (${category} = 'all' OR h."documentType" = ${category} OR h."categoryName" = ${category})
          AND (${mode} = 'all' OR h."generationMode" = ${mode})
          AND (
            ${templateId} = 'all'
            OR h."marketplaceTemplateId"::text = ${templateId}
            OR h."schoolTemplateCopyId"::text = ${templateId}
          )
          AND (
            ${q} = ''
            OR h."templateName" ILIKE ${`%${q}%`}
            OR h."documentType" ILIKE ${`%${q}%`}
            OR s."name" ILIKE ${`%${q}%`}
            OR s."rollNumber" ILIKE ${`%${q}%`}
            OR s."admissionNo" ILIKE ${`%${q}%`}
            OR h."metadata"::text ILIKE ${`%${q}%`}
          )
        ORDER BY h."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ count }] = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS count
        FROM "DocumentGenerationHistory" h
        LEFT JOIN "Student" s ON s."userId" = h."studentId"
        WHERE h."schoolId" = ${schoolId}::uuid
          AND (${category} = 'all' OR h."documentType" = ${category} OR h."categoryName" = ${category})
          AND (${mode} = 'all' OR h."generationMode" = ${mode})
          AND (
            ${templateId} = 'all'
            OR h."marketplaceTemplateId"::text = ${templateId}
            OR h."schoolTemplateCopyId"::text = ${templateId}
          )
          AND (
            ${q} = ''
            OR h."templateName" ILIKE ${`%${q}%`}
            OR h."documentType" ILIKE ${`%${q}%`}
            OR s."name" ILIKE ${`%${q}%`}
            OR s."rollNumber" ILIKE ${`%${q}%`}
            OR s."admissionNo" ILIKE ${`%${q}%`}
            OR h."metadata"::text ILIKE ${`%${q}%`}
          )
    `;

    return NextResponse.json({
        items: rows.map(mapHistoryRow),
        total: count,
        nextOffset: offset + rows.length < count ? offset + rows.length : null,
    });
}

export async function POST(request, props) {
    const params = await props.params;
    const { schoolId } = params;
    const auth = await verifyAdminAccess(request, schoolId);
    if (auth.error) return auth.response;
    const body = await request.json();

    await ensureTemplateMarketplaceTables();

    const generatedById = body.generatedById || auth.user?.id || null;
    const template = body.template || {};
    const records = Array.isArray(body.records) && body.records.length > 0
        ? body.records
        : [{
            studentId: body.studentId || null,
            fileUrl: body.fileUrl || null,
            metadata: body.metadata || {},
        }];

    const batchId = body.batchId || (body.generationMode === 'bulk' ? uuidv4() : null);
    const generationMode = body.generationMode || (records.length > 1 ? 'bulk' : 'single');

    const values = records.map((record) => ({
        schoolId,
        marketplaceTemplateId: template.marketplaceTemplateId || body.marketplaceTemplateId || null,
        schoolTemplateCopyId: template.schoolTemplateCopyId || body.schoolTemplateCopyId || null,
        templateVersionId: template.templateVersionId || body.templateVersionId || null,
        templateName: template.name || body.templateName || 'Untitled document',
        documentType: template.documentType || body.documentType || 'school-document',
        categoryName: template.category?.name || body.categoryName || null,
        generationMode,
        studentId: record.studentId || null,
        classId: Number(record.classId || body.classId) || null,
        sectionId: Number(record.sectionId || body.sectionId) || null,
        generatedById,
        issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
        fileUrl: record.fileUrl || body.fileUrl || null,
        zipUrl: body.zipUrl || record.zipUrl || null,
        status: record.status || body.status || 'generated',
        metadata: {
            ...(record.metadata || {}),
            ...(body.metadata || {}),
            batchId,
            certificateNumber: record.certificateNumber || body.certificateNumber || null,
        },
    }));

    const inserted = [];
    for (const value of values) {
        const [row] = await prisma.$queryRaw`
            INSERT INTO "DocumentGenerationHistory" (
                "schoolId", "marketplaceTemplateId", "schoolTemplateCopyId", "templateVersionId",
                "templateName", "documentType", "categoryName", "generationMode", "studentId",
                "classId", "sectionId", "generatedById", "issueDate", "fileUrl", "zipUrl",
                "status", "metadata"
            )
            VALUES (
                ${value.schoolId}::uuid, ${value.marketplaceTemplateId}::uuid, ${value.schoolTemplateCopyId}::uuid, ${value.templateVersionId}::uuid,
                ${value.templateName}, ${value.documentType}, ${value.categoryName}, ${value.generationMode}, ${value.studentId}::uuid,
                ${value.classId}, ${value.sectionId}, ${value.generatedById}::uuid, ${value.issueDate}, ${value.fileUrl}, ${value.zipUrl},
                ${value.status}, ${JSON.stringify(value.metadata)}::jsonb
            )
            RETURNING "id"
        `;
        inserted.push(row.id);
    }

    return NextResponse.json({ success: true, ids: inserted, count: inserted.length, batchId });
}

export async function DELETE(request, props) {
    const params = await props.params;
    const { schoolId } = params;
    const auth = await verifyAdminAccess(request, schoolId);
    if (auth.error) return auth.response;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const batchId = searchParams.get('batchId');

    await ensureTemplateMarketplaceTables();

    if (!id && !batchId) {
        return NextResponse.json({ error: 'Missing id or batchId' }, { status: 400 });
    }

    if (batchId) {
        const result = await prisma.$executeRaw`
            DELETE FROM "DocumentGenerationHistory"
            WHERE "schoolId" = ${schoolId}::uuid
              AND "metadata"->>'batchId' = ${batchId}
        `;
        return NextResponse.json({ success: true, count: Number(result) || 0 });
    }

    await prisma.$executeRaw`
        DELETE FROM "DocumentGenerationHistory"
        WHERE "schoolId" = ${schoolId}::uuid AND "id" = ${id}::uuid
    `;
    return NextResponse.json({ success: true });
}
