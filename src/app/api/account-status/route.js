import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const active = await prisma.user.count({
            where: {
                status: 'ACTIVE',
                role: {
                    name: {
                        not: 'SUPER_ADMIN',
                    },
                },
            },
        });

        const inactive = await prisma.user.count({
            where: {
                status: 'INACTIVE',
                role: {
                    name: {
                        not: 'SUPER_ADMIN',
                    },
                },
            },
        });

        const total = active + inactive;

        return NextResponse.json({
            total,
            active,
            inactive,
        });
    } catch (err) {
        return NextResponse.json(
            { error: 'Failed to fetch account stats', message: err.message },
            { status: 500 }
        );
    }
}
