import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await request.json();
        const { classId, sectionId, studentIds } = body;

        let whereClause = {
            schoolId,
            isActive: true,
        };

        if (studentIds && studentIds.length > 0) {
            whereClause.userId = { in: studentIds };
        } else {
            // If classId is provided, filter by class profile
            if (classId) {
                whereClause.classId = parseInt(classId); // Check if classId in Student model is Int or String relation? Its usually relational.
                // Actually Student model relates to Class via classId (Int).
            }
            if (sectionId && sectionId !== 'ALL') {
                whereClause.sectionId = parseInt(sectionId);
            }
        }

        // We need to fetch Students ensuring we get class/section details
        // Note: The Student model is linked to User.
        const students = await prisma.student.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        profilePicture: true,
                    }
                },
                class: {
                    select: { className: true }
                },
                section: {
                    select: { name: true }
                },
                parent: {
                    select: {
                        fatherName: true,
                        motherName: true,
                        fatherMobile: true,
                        address: true
                    }
                }
            },
            orderBy: {
                rollNumber: 'asc'
            }
        });

        // Format for frontend
        const formattedStudents = students.map(s => ({
            id: s.userId,
            name: s.user.name,
            rollNumber: s.rollNumber,
            admissionNo: s.admissionNo,
            className: s.class?.className,
            section: s.section?.name,
            photo: s.user.profilePicture,
            dob: s.dateOfBirth,
            fatherName: s.parent?.fatherName,
            motherName: s.parent?.motherName,
            address: s.parent?.address,
            emergencyContact: s.parent?.fatherMobile,
            bloodGroup: s.bloodGroup
        }));

        return NextResponse.json({
            count: formattedStudents.length,
            students: formattedStudents
        });

    } catch (error) {
        console.error('Error fetching bulk ID card data:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
