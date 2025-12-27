import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch import history for a school
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;
        const searchParams = Object.fromEntries(req.nextUrl.searchParams);
        const { page = '1', limit = '20', module } = searchParams;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const where = {
            schoolId,
            ...(module && module !== 'all' ? { module } : {})
        };

        const [history, total] = await Promise.all([
            prisma.importHistory.findMany({
                where,
                include: {
                    user: {
                        select: { name: true, email: true, profilePicture: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum
            }),
            prisma.importHistory.count({ where })
        ]);

        return NextResponse.json({
            history,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum)
        });

    } catch (error) {
        console.error('[IMPORT HISTORY ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
