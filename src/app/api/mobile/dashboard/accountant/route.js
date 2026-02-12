// app/api/mobile/dashboard/accountant/route.js
// Consolidated dashboard API for Accountant role
// Returns: fee summary, today's collections, recent payments, notices, events

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/mobile/dashboard/accountant
 * Query params: schoolId, userId
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('schoolId');
        const userId = searchParams.get('userId');

        if (!schoolId || !userId) {
            return NextResponse.json(
                { error: 'Missing required parameters: schoolId, userId' },
                { status: 400 }
            );
        }

        // Get active academic year
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true }
        });

        // Execute all queries in parallel
        const [
            feeSummary,
            todaysCollections,
            recentPayments,
            noticesData,
            eventsData,
        ] = await Promise.all([
            fetchFeeSummary(schoolId, academicYear?.id),
            fetchTodaysCollections(schoolId),
            fetchRecentPayments(schoolId, 10),
            fetchNotices(schoolId, userId, 5),
            fetchUpcomingEvents(schoolId, 5),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                academicYear,
                fees: feeSummary,
                todaysCollections,
                recentPayments,
                notices: noticesData,
                events: eventsData,
            }
        });

    } catch (error) {
        console.error('Accountant dashboard error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data', details: error.message },
            { status: 500 }
        );
    }
}

async function fetchFeeSummary(schoolId, academicYearId) {
    try {
        if (!academicYearId) return null;

        const fees = await prisma.studentFee.aggregate({
            where: { student: { schoolId }, academicYearId },
            _sum: {
                originalAmount: true,
                paidAmount: true,
                balanceAmount: true
            }
        });

        const totalFees = fees._sum.originalAmount || 0;
        const collected = fees._sum.paidAmount || 0;
        const pending = fees._sum.balanceAmount || 0;
        const collectionRate = totalFees > 0 ? Math.round((collected / totalFees) * 100) : 0;

        return {
            totalFees,
            collected,
            pending,
            collectionRate
        };
    } catch (error) {
        console.error('fetchFeeSummary error:', error);
        return null;
    }
}

async function fetchTodaysCollections(schoolId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayPayments = await prisma.feePayment.aggregate({
            where: {
                schoolId,
                paymentDate: { gte: today, lt: tomorrow },
                status: 'SUCCESS',
            },
            _count: true,
            _sum: { amount: true },
        });

        return {
            count: todayPayments._count || 0,
            totalAmount: todayPayments._sum.amount || 0,
        };
    } catch (error) {
        console.error('fetchTodaysCollections error:', error);
        return { count: 0, totalAmount: 0 };
    }
}

async function fetchRecentPayments(schoolId, limit) {
    try {
        const payments = await prisma.feePayment.findMany({
            where: {
                schoolId,
                status: 'SUCCESS',
            },
            orderBy: { paymentDate: 'desc' },
            take: limit,
            select: {
                id: true,
                amount: true,
                paymentMethod: true,
                paymentDate: true,
                receiptNumber: true,
                studentFee: {
                    select: {
                        student: {
                            select: {
                                name: true,
                                admissionNo: true,
                                class: { select: { className: true } },
                                section: { select: { name: true } },
                            }
                        }
                    }
                }
            }
        });

        return payments.map(p => ({
            id: p.id,
            amount: p.amount,
            method: p.paymentMethod,
            date: p.paymentDate,
            receiptNumber: p.receiptNumber,
            studentName: p.studentFee?.student?.name || 'Unknown',
            admissionNo: p.studentFee?.student?.admissionNo || '',
            className: p.studentFee?.student?.class?.className || '',
            sectionName: p.studentFee?.student?.section?.name || '',
        }));
    } catch (error) {
        console.error('fetchRecentPayments error:', error);
        return [];
    }
}

async function fetchNotices(schoolId, userId, limit) {
    try {
        // Get user's read notices
        const readNoticeIds = await prisma.noticeRead.findMany({
            where: { userId },
            select: { noticeId: true },
        });
        const readSet = new Set(readNoticeIds.map(r => r.noticeId));

        const notices = await prisma.notice.findMany({
            where: { schoolId, status: 'PUBLISHED' },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                title: true,
                createdAt: true,
                Author: { select: { name: true } },
            }
        });

        return notices.map(n => ({
            id: n.id,
            title: n.title,
            time: n.createdAt,
            sender: n.Author?.name || 'School',
            unread: !readSet.has(n.id),
        }));
    } catch (error) {
        console.error('fetchNotices error:', error);
        return [];
    }
}

async function fetchUpcomingEvents(schoolId, limit) {
    try {
        const now = new Date();
        const events = await prisma.calendarEvent.findMany({
            where: {
                schoolId,
                startDate: { gte: now },
            },
            orderBy: { startDate: 'asc' },
            take: limit,
            select: {
                id: true,
                title: true,
                startDate: true,
                endDate: true,
                eventType: true,
            }
        });

        const eventIcons = {
            HOLIDAY: '🎉',
            EXAM: '📝',
            MEETING: '🤝',
            ACTIVITY: '🎯',
            SPORTS: '⚽',
            CULTURAL: '🎭',
            OTHER: '📌',
        };

        const eventColors = {
            HOLIDAY: '#10B981',
            EXAM: '#EF4444',
            MEETING: '#3B82F6',
            ACTIVITY: '#F59E0B',
            SPORTS: '#06B6D4',
            CULTURAL: '#8B5CF6',
            OTHER: '#6B7280',
        };

        return events.map(e => ({
            id: e.id,
            title: e.title,
            date: new Date(e.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            icon: eventIcons[e.eventType] || '📌',
            color: eventColors[e.eventType] || '#6B7280',
        }));
    } catch (error) {
        console.error('fetchUpcomingEvents error:', error);
        return [];
    }
}
