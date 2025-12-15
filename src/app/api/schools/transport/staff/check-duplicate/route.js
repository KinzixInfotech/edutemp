// app/api/schools/transport/staff/check-duplicate/route.js
// Check for duplicate email, phone, or employee ID

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const field = searchParams.get('field'); // email, contactNumber, employeeId
    const value = searchParams.get('value');

    if (!schoolId || !field || !value) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    try {
        let exists = false;

        if (field === 'email') {
            // Check in User table and TransportStaff
            const user = await prisma.user.findUnique({ where: { email: value } });
            exists = !!user;
        } else if (field === 'contactNumber') {
            // Check in TransportStaff only
            const staff = await prisma.transportStaff.findFirst({
                where: { schoolId, contactNumber: value }
            });
            exists = !!staff;
        } else if (field === 'employeeId') {
            // Check in TransportStaff
            const staff = await prisma.transportStaff.findFirst({
                where: { schoolId, employeeId: value }
            });
            exists = !!staff;
        }

        return NextResponse.json({ exists, field, value });
    } catch (error) {
        console.error('Error checking duplicate:', error);
        return NextResponse.json({ error: 'Failed to check duplicate' }, { status: 500 });
    }
}
