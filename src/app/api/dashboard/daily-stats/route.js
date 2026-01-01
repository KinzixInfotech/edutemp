// app/api/dashboard/daily-stats/route.js
// Optimized dashboard stats with Redis caching

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('schoolId');
        const academicYearId = searchParams.get('academicYearId');

        if (!schoolId) {
            return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Use Redis cache with key based on schoolId and date
        const cacheKey = generateKey('daily-stats', {
            schoolId,
            academicYearId,
            date: today.toISOString().split('T')[0]
        });

        const stats = await remember(cacheKey, async () => {
            // Single parallel query for all stats - highly optimized
            const [
                studentAttendance,
                teachingStaffAttendance,
                nonTeachingStaffAttendance,
                totalStudents,
                totalTeachingStaff,
                totalNonTeachingStaff,
                todayPayments,
                totalCollected,
                recentPayments
            ] = await Promise.all([
                // Students present today
                prisma.attendance.count({
                    where: {
                        schoolId,
                        date: { gte: today, lt: tomorrow },
                        status: 'PRESENT',
                        user: {
                            role: { name: 'STUDENT' }
                        }
                    }
                }),

                // Teaching staff present today
                prisma.attendance.count({
                    where: {
                        schoolId,
                        date: { gte: today, lt: tomorrow },
                        status: 'PRESENT',
                        user: {
                            role: { name: 'TEACHING_STAFF' }
                        }
                    }
                }),

                // Non-Teaching staff present today
                prisma.attendance.count({
                    where: {
                        schoolId,
                        date: { gte: today, lt: tomorrow },
                        status: 'PRESENT',
                        user: {
                            role: { name: 'NON_TEACHING_STAFF' }
                        }
                    }
                }),

                // Total students in school
                prisma.student.count({
                    where: { schoolId }
                }),

                // Total teaching staff in school
                prisma.user.count({
                    where: { schoolId, role: { name: 'TEACHING_STAFF' } }
                }),

                // Total non-teaching staff in school
                prisma.user.count({
                    where: { schoolId, role: { name: 'NON_TEACHING_STAFF' } }
                }),

                // Payments received today
                academicYearId ? prisma.feePayment.aggregate({
                    where: {
                        schoolId,
                        academicYearId,
                        paymentDate: { gte: today, lt: tomorrow },
                        status: 'SUCCESS'
                    },
                    _sum: { amount: true },
                    _count: true
                }) : { _sum: { amount: null }, _count: 0 },

                // Total collected this academic year
                academicYearId ? prisma.feePayment.aggregate({
                    where: {
                        schoolId,
                        academicYearId,
                        status: 'SUCCESS'
                    },
                    _sum: { amount: true }
                }) : { _sum: { amount: null } },

                // Recent payments for display
                academicYearId ? prisma.feePayment.findMany({
                    where: {
                        schoolId,
                        academicYearId,
                        status: 'SUCCESS'
                    },
                    orderBy: { paymentDate: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        amount: true,
                        paymentDate: true,
                        paymentMethod: true,
                        receiptNumber: true,
                        student: {
                            select: {
                                user: { select: { name: true } },
                                admissionNo: true,
                                class: { select: { className: true } },
                                section: { select: { name: true } }
                            }
                        }
                    }
                }) : []
            ]);

            return {
                studentsPresent: studentAttendance,
                totalStudents: totalStudents,
                teachingStaffPresent: teachingStaffAttendance,
                nonTeachingStaffPresent: nonTeachingStaffAttendance,
                teachersPresent: teachingStaffAttendance + nonTeachingStaffAttendance, // Backward compat
                totalTeachingStaff: totalTeachingStaff,
                totalNonTeachingStaff: totalNonTeachingStaff,
                paymentsToday: {
                    amount: todayPayments._sum.amount || 0,
                    count: todayPayments._count || 0
                },
                totalCollected: totalCollected._sum.amount || 0,
                recentPayments: recentPayments,
                date: today.toISOString()
            };
        }, 60); // Cache for 1 minute

        return NextResponse.json(stats);
    } catch (error) {
        console.error('[DAILY STATS ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch daily stats' },
            { status: 500 }
        );
    }
}
