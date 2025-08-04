import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const body = await req.json();

        const { sectionId, periods, breakIndex, timetable } = body;

        // Flatten timetable
        const entries = Object.entries(timetable).flatMap(([day, periodsArr]) =>
            periodsArr.map((entry, index) => ({
                day,
                period: index + 1,
                subject: entry?.subject || '',
                teacher: entry?.teacher || '',
                sectionId: sectionId,
            }))
        );

        // Create many
        await prisma.timetable.createMany({
            data: entries.filter(e => e.subject), // only save if subject is provided
        });

        return NextResponse.json({ success: true, message: 'Timetable saved' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, message: 'Error saving timetable' }, { status: 500 });
    }
}
