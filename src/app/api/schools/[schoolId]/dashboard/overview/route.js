// app/api/schools/[schoolId]/dashboard/overview/route.js
// Comprehensive dashboard statistics for Director/Principal views
// Uses Redis caching for optimal performance

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params; // Await params for Next.js 15+
        const { searchParams } = new URL(req.url);
        const academicYearId = searchParams.get('academicYearId');

        if (!schoolId) {
            return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Redis cache key with date for daily refresh
        const cacheKey = generateKey('dashboard:overview', {
            schoolId,
            academicYearId,
            date: today.toISOString().split('T')[0]
        });

        const stats = await remember(cacheKey, async () => {
            // Parallel queries for all dashboard statistics
            const [
                studentsTotal,
                studentsPresent,
                studentsAbsent,
                teachersTotal,
                teachersOnLeave,
                teachersPresent,
                feesCollected,
                feesPending,
                payrollPending,
                libraryBooks,
                libraryIssued,
                libraryRequests,
                inventoryTotal,
                inventoryLowStock,
                transportBuses,
                transportActiveRoutes,
                classesTotal,
                examsThisWeek
            ] = await Promise.all([
                // 1. Total students count
                prisma.student.count({
                    where: {
                        schoolId,
                        user: { deletedAt: null, status: 'ACTIVE' }
                    }
                }),

                // 2. Students present today
                prisma.attendance.count({
                    where: {
                        schoolId,
                        date: { gte: today, lt: tomorrow },
                        status: 'PRESENT',
                        user: { role: { name: 'STUDENT' } }
                    }
                }),

                // 3. Students absent today
                prisma.attendance.count({
                    where: {
                        schoolId,
                        date: { gte: today, lt: tomorrow },
                        status: 'ABSENT',
                        user: { role: { name: 'STUDENT' } }
                    }
                }),

                // 4. Total teachers (teaching + non-teaching staff)
                prisma.user.count({
                    where: {
                        schoolId,
                        deletedAt: null,
                        status: 'ACTIVE',
                        role: { name: { in: ['TEACHING_STAFF', 'NON_TEACHING_STAFF'] } }
                    }
                }),

                // 5. Teachers on leave today
                prisma.attendance.count({
                    where: {
                        schoolId,
                        date: { gte: today, lt: tomorrow },
                        status: 'ON_LEAVE',
                        user: { role: { name: { in: ['TEACHING_STAFF', 'NON_TEACHING_STAFF'] } } }
                    }
                }),

                // 6. Teachers present today
                prisma.attendance.count({
                    where: {
                        schoolId,
                        date: { gte: today, lt: tomorrow },
                        status: 'PRESENT',
                        user: { role: { name: { in: ['TEACHING_STAFF', 'NON_TEACHING_STAFF'] } } }
                    }
                }),

                // 7. Fees collected this month
                academicYearId ? prisma.feePayment.aggregate({
                    where: {
                        schoolId,
                        academicYearId,
                        status: 'SUCCESS',
                        paymentDate: {
                            gte: new Date(today.getFullYear(), today.getMonth(), 1),
                            lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
                        }
                    },
                    _sum: { amount: true }
                }).catch(() => ({ _sum: { amount: 0 } })) : { _sum: { amount: 0 } },

                // 8. Fees pending (total)
                academicYearId ? prisma.$queryRaw`
                    SELECT 
                        COUNT(DISTINCT fs."studentId") as "pendingCount",
                        COALESCE(SUM(fs."totalAmount" - COALESCE(fs."paidAmount", 0)), 0) as "pendingAmount"
                    FROM "FeeStructure" fs
                    WHERE fs."schoolId" = ${schoolId}::uuid
                    AND fs."academicYearId" = ${academicYearId}::uuid
                    AND fs."totalAmount" > COALESCE(fs."paidAmount", 0)
                `.catch(() => [{ pendingCount: 0, pendingAmount: 0 }]) : [{ pendingCount: 0, pendingAmount: 0 }],

                // 9. Payroll pending (current month)
                prisma.payrollPeriod.aggregate({
                    where: {
                        schoolId,
                        status: { in: ['DRAFT', 'PROCESSING'] },
                        startDate: {
                            gte: new Date(today.getFullYear(), today.getMonth(), 1)
                        }
                    },
                    _sum: { totalNetSalary: true }
                }).catch(() => ({ _sum: { totalNetSalary: 0 } })),

                // 10. Library total books (using LibraryBook model)
                prisma.libraryBook.count({
                    where: { schoolId }
                }).catch(() => 0),

                // 11. Library books currently issued (using LibraryTransaction model)
                prisma.libraryTransaction.count({
                    where: {
                        schoolId,
                        returnDate: null,
                        status: 'BORROWED'
                    }
                }).catch(() => 0),

                // 12. Library approval requests (using LibraryBookRequest model)
                prisma.libraryBookRequest.count({
                    where: {
                        schoolId,
                        status: 'PENDING'
                    }
                }).catch(() => 0),

                // 13. Inventory total items
                prisma.inventoryItem.count({
                    where: { schoolId }
                }).catch(() => 0),

                // 14. Inventory low stock items  
                prisma.inventoryItem.count({
                    where: {
                        schoolId,
                        quantity: { lte: 10 } // Simple threshold
                    }
                }).catch(() => 0),

                // 15. Transport total vehicles (buses)
                prisma.vehicle.count({
                    where: { schoolId, status: 'active' }
                }).catch(() => 0),

                // 16. Transport active routes (trips in progress today)
                prisma.busTrip.count({
                    where: {
                        vehicle: { schoolId },
                        date: { gte: today, lt: tomorrow },
                        status: 'IN_TRANSIT'
                    }
                }).catch(() => 0),

                // 17. Total classes
                academicYearId ? prisma.class.count({
                    where: {
                        schoolId,
                        academicYearId
                    }
                }).catch(() => 0) : 0,

                // 18. Exams this week
                prisma.exam.count({
                    where: {
                        schoolId,
                        startDate: {
                            gte: today,
                            lt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                }).catch(() => 0)
            ]);

            // Extract fee pending data
            const feesPendingData = feesPending[0] || { pendingCount: 0, pendingAmount: 0 };

            // Calculate attendance percentage
            const totalStudentsMarked = studentsPresent + studentsAbsent;
            const attendancePercentage = totalStudentsMarked > 0
                ? ((studentsPresent / totalStudentsMarked) * 100).toFixed(1)
                : 0;

            return {
                students: {
                    total: studentsTotal,
                    present: studentsPresent,
                    absent: studentsAbsent
                },
                teachers: {
                    total: teachersTotal,
                    present: teachersPresent,
                    onLeave: teachersOnLeave
                },
                attendance: {
                    present: studentsPresent,
                    absent: studentsAbsent,
                    percentage: parseFloat(attendancePercentage)
                },
                fees: {
                    collected: feesCollected._sum.amount || 0,
                    pending: Number(feesPendingData.pendingAmount) || 0,
                    pendingCount: Number(feesPendingData.pendingCount) || 0
                },
                payroll: {
                    pending: payrollPending._sum.totalNetSalary || 0,
                    approvalCount: 0 // No approval model in schema
                },
                library: {
                    totalBooks: libraryBooks,
                    issued: libraryIssued,
                    approvalRequests: libraryRequests
                },
                inventory: {
                    totalItems: inventoryTotal,
                    lowStock: inventoryLowStock
                },
                transport: {
                    totalBuses: transportBuses,
                    activeRoutes: transportActiveRoutes
                },
                academics: {
                    totalClasses: classesTotal,
                    activeNow: 0, // Would need timetable logic
                    examsThisWeek: examsThisWeek
                },
                updatedAt: new Date().toISOString()
            };
        }, 300); // Cache for 5 minutes

        return NextResponse.json(stats);
    } catch (error) {
        console.error('[DASHBOARD OVERVIEW ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard statistics', details: error.message },
            { status: 500 }
        );
    }
}
