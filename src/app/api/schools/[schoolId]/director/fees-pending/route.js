import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(req.url);
        const academicYearId = searchParams.get('academicYearId');

        if (!academicYearId) {
            return NextResponse.json({ error: 'academicYearId required' }, { status: 400 });
        }

        const cacheKey = generateKey('director:fees-pending', { schoolId, academicYearId });

        const data = await remember(cacheKey, async () => {
            const pendingFees = await prisma.$queryRaw`
                SELECT 
                    s."admissionNo",
                    u."name" as "studentName",
                    u.email,
                    fs."totalAmount",
                    COALESCE(fs."paidAmount", 0) as "paidAmount",
                    (fs."totalAmount" - COALESCE(fs."paidAmount", 0)) as "pendingAmount",
                    fs."dueDate",
                    CASE 
                        WHEN fs."dueDate" < CURRENT_DATE THEN true
                        ELSE false
                    END as "isOverdue"
                FROM "FeeStructure" fs
                INNER JOIN "Student" s ON fs."studentId" = s."userId"
                INNER JOIN "User" u ON s."userId" = u.id
                WHERE fs."schoolId" = ${schoolId}::uuid
                AND fs."academicYearId" = ${academicYearId}::uuid
                AND fs."totalAmount" > COALESCE(fs."paidAmount", 0)
                ORDER BY fs."dueDate" ASC, "pendingAmount" DESC
                LIMIT 100
            `;

            const summary = await prisma.$queryRaw`
                SELECT 
                    COUNT(DISTINCT fs."studentId") as "studentCount",
                    COALESCE(SUM(fs."totalAmount" - COALESCE(fs."paidAmount", 0)), 0) as "totalPending",
                    COUNT(CASE WHEN fs."dueDate" < CURRENT_DATE THEN 1 END) as "overdueCount"
                FROM "FeeStructure" fs
                WHERE fs."schoolId" = ${schoolId}::uuid
                AND fs."academicYearId" = ${academicYearId}::uuid
                AND fs."totalAmount" > COALESCE(fs."paidAmount", 0)
            `;

            return {
                summary: {
                    totalPending: Number(summary[0].totalPending) || 0,
                    studentCount: Number(summary[0].studentCount) || 0,
                    overdueCount: Number(summary[0].overdueCount) || 0
                },
                pendingStudents: pendingFees.map(f => ({
                    admissionNo: f.admissionNo,
                    studentName: f.studentName,
                    email: f.email,
                    totalAmount: Number(f.totalAmount),
                    paidAmount: Number(f.paidAmount),
                    pendingAmount: Number(f.pendingAmount),
                    dueDate: f.dueDate,
                    isOverdue: f.isOverdue
                }))
            };
        }, 60);

        return NextResponse.json(data);
    } catch (error) {
        console.error('[FEES PENDING ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch pending fees', details: error.message },
            { status: 500 }
        );
    }
}
