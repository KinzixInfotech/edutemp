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
                            select: {
                                id: true,
                                name: true,
                                contactNumber: true,
                                email: true,
                                user: {
                                    select: {
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        // Resolve parent info from StudentParentLink (real Parent model) with fallback to inline fields
        const parentLinks = student.studentParentLinks || [];
        const fatherLink = parentLinks.find(l => l.relation === 'FATHER');
        const motherLink = parentLinks.find(l => l.relation === 'MOTHER');
        const guardianLink = parentLinks.find(l => l.relation === 'GUARDIAN' || l.relation === 'GRANDFATHER' || l.relation === 'GRANDMOTHER' || l.relation === 'UNCLE' || l.relation === 'AUNT' || l.relation === 'OTHER');

        // Father: prefer linked Parent, fallback to inline fields
        const fatherName = fatherLink?.parent?.name || fatherLink?.parent?.user?.name || student.FatherName || null;
        const fatherPhone = fatherLink?.parent?.contactNumber || student.FatherNumber || null;

        // Mother: prefer linked Parent, fallback to inline fields
        const motherName = motherLink?.parent?.name || motherLink?.parent?.user?.name || student.MotherName || null;
        const motherPhone = motherLink?.parent?.contactNumber || student.MotherNumber || null;

        // Guardian: prefer linked Parent, fallback to inline fields
        const guardianName = guardianLink?.parent?.name || guardianLink?.parent?.user?.name || student.GuardianName || null;
        const guardianRelation = guardianLink?.relation || student.GuardianRelation || null;
        const guardianPhone = guardianLink?.parent?.contactNumber || null;

        return NextResponse.json({
            id: student.userId,
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
            fatherName,
            motherName,
            fatherPhone,
            motherPhone,
            guardianName,
            guardianRelation,
            guardianPhone,
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
            // All linked parents for richer display
            parents: parentLinks.map(link => ({
                name: link.parent?.name || link.parent?.user?.name,
                relation: link.relation,
                phone: link.parent?.contactNumber,
                email: link.parent?.user?.email || link.parent?.email,
                isPrimary: link.isPrimary
            }))
        });
    } catch (error) {
        console.error('[STUDENT DETAIL ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch student', details: error.message },
            { status: 500 }
        );
    }
}
