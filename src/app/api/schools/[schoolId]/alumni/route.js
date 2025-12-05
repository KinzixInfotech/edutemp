import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Fetch alumni with filters
export async function GET(req, props) {
  const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const graduationYear = searchParams.get('graduationYear');
    const leavingReason = searchParams.get('leavingReason');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        const where = {
            schoolId,
            ...(graduationYear && { graduationYear: parseInt(graduationYear) }),
            ...(leavingReason && { leavingReason }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { admissionNo: { contains: search, mode: 'insensitive' } }
                ]
            })
        };

        const [alumni, total] = await Promise.all([
            prisma.alumni.findMany({
                where,
                include: {
                    lastClass: {
                        select: {
                            className: true
                        }
                    },
                    lastSection: {
                        select: {
                            name: true
                        }
                    }
                },
                orderBy: {
                    graduationYear: 'desc'
                },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.alumni.count({ where })
        ]);

        return NextResponse.json({
            success: true,
            alumni,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching alumni:', error);
        return NextResponse.json(
            { error: 'Failed to fetch alumni', details: error.message },
            { status: 500 }
        );
    }
}
