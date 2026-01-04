/**
 * Dashboard Context API
 * Returns today's context for a school (no AI calls)
 * 
 * GET /api/dashboard/context?schoolId=xxx
 */

import { NextResponse } from 'next/server';
import { getDashboardContext } from '@/lib/ai/dayContextEngine';
import { getStaticMessage } from '@/lib/ai/rules';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('schoolId');

        if (!schoolId) {
            return NextResponse.json(
                { error: 'schoolId is required' },
                { status: 400 }
            );
        }

        // Get dashboard context (cached)
        const context = await getDashboardContext(schoolId);

        // Add static messages for the day type
        const response = {
            dayType: context.dayType,
            aiAllowed: context.aiAllowed,
            attendanceExpected: context.attendanceExpected,
            staffAttendanceExpected: context.staffAttendanceExpected,
            feeCollectionExpected: context.feeCollectionExpected,
            nextWorkingDay: context.nextWorkingDay,
            isHoliday: context.isHoliday,
            isSunday: context.isSunday,
            isVacation: context.isVacation,
            isExamDay: context.isExamDay,
            isHalfDay: context.isHalfDay,
            isWorkingDay: context.isWorkingDay,
            holidayName: context.holidayName,
            date: context.date,
            // Static messages for UI
            messages: {
                attendance: getStaticMessage(context.dayType, 'attendance'),
                fees: getStaticMessage(context.dayType, 'fees'),
                general: getStaticMessage(context.dayType, 'general'),
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Dashboard context error:', error);
        return NextResponse.json(
            { error: 'Failed to get dashboard context' },
            { status: 500 }
        );
    }
}
