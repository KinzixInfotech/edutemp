import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, { params }) {
    try {
        const { schoolId, studentId } = await params;

        // Validate params
        if (!schoolId || schoolId === 'null' || !studentId || studentId === 'null') {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        const student = await prisma.student.findFirst({
            where: {
                userId: studentId,
                schoolId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profilePicture: true,
                        status: true,
                        gender: true
                    }
                },
                class: {
                    select: {
                        id: true,
                        className: true
                    }
                },
                section: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                studentParentLinks: {
                    where: { isActive: true },
                    include: {
                        parent: {
                            include: {
                                user: {
                                    select: {
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    },
                    take: 2
                }
            }
        });
        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        // Get primary parent info
        const primaryParentLink = student.studentParentLinks?.find(l => l.isPrimary) || student.studentParentLinks?.[0];
        const parentInfo = primaryParentLink?.parent;

        return NextResponse.json({
            id: student.userId,
            // Use student.name (from Student model) or fallback to user.name
            name: student.name || student.user?.name || 'Unknown',
            email: student.email || student.user?.email,
            profilePicture: student.user?.profilePicture,
            status: student.user?.status,
            gender: student.gender || student.user?.gender,
            admissionNo: student.admissionNo,
            admissionNumber: student.admissionNo,
            rollNo: student.rollNumber,
            dob: student.dob,
            address: student.Address,
            city: student.city,
            state: student.state,
            country: student.country,
            postalCode: student.postalCode,
            contactNumber: student.contactNumber,
            // Use correct field names from Student model (PascalCase)
            fatherName: student.FatherName,
            motherName: student.MotherName,
            fatherPhone: student.FatherNumber,
            motherPhone: student.MotherNumber,
            guardianName: student.GuardianName,
            guardianRelation: student.GuardianRelation,
            guardianPhone: student.FatherNumber || student.MotherNumber,
            bloodGroup: student.bloodGroup,
            house: student.House,
            previousSchool: student.PreviousSchoolName,
            admissionDate: student.admissionDate,
            class: {
                id: student.classId,
                name: student.class?.className
            },
            section: {
                id: student.sectionId,
                name: student.section?.name
            },
            parent: parentInfo ? {
                name: parentInfo.name || parentInfo.user?.name,
                email: parentInfo.user?.email,
                phone: parentInfo.phone
            } : null
        });
    } catch (error) {
        console.error('[STUDENT DETAIL ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch student', details: error.message },
            { status: 500 }
        );
    }
}
