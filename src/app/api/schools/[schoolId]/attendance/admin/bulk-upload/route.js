// app/api/schools/[schoolId]/attendance/admin/bulk-upload/route.js

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';

export async function POST(req, props) {
  const params = await props.params;
    const { schoolId } = params;

    try {
        const formData = await req.formData();
        const file = formData.get('file');
        const markedBy = formData.get('markedBy');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Read file content
        const text = await file.text();
        const records = parse(text, {
            columns: true,
            skip_empty_lines: true
        });

        const results = { imported: 0, failed: [] };

        await prisma.$transaction(async (tx) => {
            for (const record of records) {
                try {
                    const { userId, date, status, remarks } = record;

                    // Validate
                    if (!userId || !date || !status) {
                        results.failed.push({ record, reason: 'Missing required fields' });
                        continue;
                    }

                    // Create attendance
                    await tx.attendance.create({
                        data: {
                            userId,
                            schoolId,
                            date: new Date(date),
                            status,
                            remarks,
                            markedBy,
                            requiresApproval: false,
                            approvalStatus: 'NOT_REQUIRED'
                        }
                    });

                    results.imported++;

                } catch (error) {
                    results.failed.push({ record, reason: error.message });
                }
            }
        });

        return NextResponse.json({
            success: true,
            imported: results.imported,
            failed: results.failed.length,
            errors: results.failed
        });

    } catch (error) {
        console.error('Bulk upload error:', error);
        return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
    }
}

// Generate template
export async function GET(req, props) {
  const params = await props.params;
    const { schoolId } = params;

    const template = `userId,date,status,remarks
example-uuid-1,2025-11-15,PRESENT,
example-uuid-2,2025-11-15,ABSENT,Sick
example-uuid-3,2025-11-15,LATE,Traffic`;

    return new NextResponse(template, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="attendance_template.csv"'
        }
    });
}