import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, { params }) {
    try {
        const { schoolId, staffId } = await params;

        // Validate params
        if (!schoolId || schoolId === 'null' || !staffId || staffId === 'null') {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        const user = await prisma.user.findFirst({
            where: {
                id: staffId,
                schoolId,
                role: {
                    name: { in: ['TEACHING_STAFF', 'NON_TEACHING_STAFF'] }
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
                status: true,
                gender: true,
                role: {
                    select: {
                        name: true
                    }
                },
                teacher: {
                    select: {
                        employeeId: true,
                        designation: true,
                        departmentId: true,
                        contactNumber: true,
                        dob: true,
                        address: true,
                        bloodGroup: true,
                        City: true,
                        state: true,
                        country: true
                    }
                },
                nonTeachingStaff: {
                    select: {
                        employeeId: true,
                        designation: true,
                        departmentId: true,
                        contactNumber: true,
                        dob: true,
                        address: true,
                        bloodGroup: true,
                        City: true,
                        state: true,
                        country: true
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
        }

        const staffData = user.teacher || user.nonTeachingStaff || {};
        const isTeaching = user.role.name === 'TEACHING_STAFF';

        return NextResponse.json({
            id: user.id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            status: user.status,
            gender: user.gender,
            type: isTeaching ? 'teaching' : 'non-teaching',
            role: user.role,
            employeeId: staffData.employeeId,
            designation: staffData.designation,
            departmentId: staffData.departmentId,
            contactNumber: staffData.contactNumber,
            phone: staffData.contactNumber,
            dob: staffData.dob,
            address: staffData.address,
            bloodGroup: staffData.bloodGroup,
            city: staffData.City,
            state: staffData.state,
            country: staffData.country
        });
    } catch (error) {
        console.error('[STAFF DETAIL ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch staff', details: error.message },
            { status: 500 }
        );
    }
}
