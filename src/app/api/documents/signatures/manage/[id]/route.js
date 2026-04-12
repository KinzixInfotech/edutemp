import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { deleteFileByUrl } from '@/lib/r2';
import { serializeSignatureAsset } from '@/lib/document-signature-library';

function normalizeSignaturePayload(body = {}) {
    return {
        ...(body.name !== undefined ? { name: String(body.name || '').trim() } : {}),
        ...(body.designation !== undefined ? { designation: body.designation ? String(body.designation).trim() : null } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: String(body.imageUrl || '').trim() } : {}),
        ...(body.placeholderKey !== undefined ? { placeholderKey: String(body.placeholderKey || 'principalSignature').trim() } : {}),
        ...(body.teacherUserId !== undefined ? { teacherUserId: body.teacherUserId || null } : {}),
        ...(body.classId !== undefined ? { classId: body.classId == null || body.classId === '' ? null : Number.parseInt(body.classId, 10) } : {}),
        ...(body.sectionId !== undefined ? { sectionId: body.sectionId == null || body.sectionId === '' ? null : Number.parseInt(body.sectionId, 10) } : {}),
        ...(body.tags !== undefined ? {
            tags: Array.isArray(body.tags)
                ? body.tags.map(tag => String(tag).trim()).filter(Boolean)
                : String(body.tags || '')
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(Boolean)
        } : {}),
        ...(body.isDefault !== undefined ? { isDefault: !!body.isDefault } : {}),
        ...(body.isActive !== undefined ? { isActive: !!body.isActive } : {}),
    };
}

export async function PUT(request, props) {
    const params = await props.params;
    const { id } = params;
    const body = await request.json();
    try {
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
        const existing = await prisma.signature.findUnique({
            where: { id },
            select: {
                id: true,
                schoolId: true,
                placeholderKey: true,
            },
        });
        if (!existing) return NextResponse.json({ error: 'Signature not found' }, { status: 404 });

        const payload = normalizeSignaturePayload(body);
        const placeholderKey = payload.placeholderKey || existing.placeholderKey;

        const signature = await prisma.$transaction(async (tx) => {
            if (payload.isDefault) {
                await tx.signature.updateMany({
                    where: {
                        schoolId: existing.schoolId,
                        placeholderKey,
                        NOT: { id },
                    },
                    data: { isDefault: false },
                });
            }

            return tx.signature.update({
                where: { id },
                data: payload,
                include: {
                    teacher: {
                        select: {
                            userId: true,
                            name: true,
                            employeeId: true,
                        },
                    },
                    class: {
                        select: {
                            id: true,
                            className: true,
                        },
                    },
                    section: {
                        select: {
                            id: true,
                            name: true,
                            classId: true,
                        },
                    },
                },
            });
        });
        return NextResponse.json(serializeSignatureAsset(signature));
    } catch (error) {
        console.error('[SIGNATURE_API_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request, props) {
    const params = await props.params;
    const { id } = params;
    try {
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
        const existing = await prisma.signature.findUnique({
            where: { id },
            select: { imageUrl: true },
        });
        if (!existing) return NextResponse.json({ error: 'Signature not found' }, { status: 404 });

        await prisma.signature.delete({
            where: { id },
        });

        await deleteFileByUrl(existing.imageUrl);
        return NextResponse.json({ message: 'Deleted' });
    } catch (error) {
        console.error('[SIGNATURE_API_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
