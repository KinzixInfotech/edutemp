import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req) {
    try {
        const { school, profile } = await req.json();
        
        const upsertedSchool = await prisma.school.upsert({
            where: { schoolCode: school.schoolCode || 'invalid-code' },
            update: { ...school },
            create: {
                ...school,
                publicProfile: {
                    create: { ...profile },
                },
            },
        });
        
        return NextResponse.json({ success: true, upsertedSchool });
    } catch (e) {
        return NextResponse.json({ success: false, errorMessage: e.message, code: e.code, meta: e.meta }, {status: 500});
    }
}
