import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        if (!schoolId || schoolId === 'null') {
            return NextResponse.json({ error: 'Invalid schoolId' }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const academicYearId = searchParams.get('academicYearId');

        const cacheKey = generateKey('director:fees-pending', { schoolId, academicYearId });

        const data = await remember(cacheKey, async () => {
            // If no academicYearId, get latest one
            let yearId = academicYearId;
            if (!yearId) {
                const latestYear = await prisma.academicYear.findFirst({
                    where: { schoolId },
                    orderBy: { startDate: 'desc' }
                });
                yearId = latestYear?.id;
            }

            if (!yearId) {
                return {
                    summary: { totalPending: 0, studentCount: 0, overdueCount: 0 },
                    pendingStudents: []
                };
            }

            const pendingFees = await prisma.$queryRaw`
                SELECT 
                    s."admissionNo",
                    u."name" as "studentName",
                    u.email,
                    sf."finalAmount" as "totalAmount",
                    sf."paidAmount",
                    sf."balanceAmount" as "pendingAmount",
                    sf."assignedDate" as "dueDate",
                    CASE 
                        WHEN sf."status" = 'OVERDUE' THEN true
                        ELSE false
                    END as "isOverdue"
                FROM "StudentFee" sf
                INNER JOIN "Student" s ON sf."studentId" = s."userId"
                INNER JOIN "User" u ON s."userId" = u."id"
                WHERE sf."schoolId" = ${schoolId}::uuid
                AND sf."academicYearId" = ${yearId}::uuid
                AND sf."balanceAmount" > 0
                ORDER BY sf."balanceAmount" DESC
                LIMIT 100
            `;

            const summary = await prisma.$queryRaw`
                SELECT 
                    COUNT(DISTINCT sf."studentId") as "studentCount",
                    COALESCE(SUM(sf."balanceAmount"), 0) as "totalPending",
                    COUNT(CASE WHEN sf."status" = 'OVERDUE' THEN 1 END) as "overdueCount"
                FROM "StudentFee" sf
                WHERE sf."schoolId" = ${schoolId}::uuid
                AND sf."academicYearId" = ${yearId}::uuid
                AND sf."balanceAmount" > 0
            `;


            return {
                summary: {
                    totalPending: Number(summary[0]?.totalPending) || 0,
                    studentCount: Number(summary[0]?.studentCount) || 0,
                    overdueCount: Number(summary[0]?.overdueCount) || 0
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
