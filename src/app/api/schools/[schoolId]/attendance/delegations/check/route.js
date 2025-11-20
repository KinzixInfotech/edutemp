// // // app/api/schools/[schoolId]/attendance/delegations/check/route.js
// // import prisma from '@/lib/prisma';
// // import { NextResponse } from 'next/server';

// // const ISTDate = (input) => {
// //     if (!input) {
// //         const now = new Date();
// //         const year = now.getFullYear();
// //         const month = String(now.getMonth() + 1).padStart(2, '0');
// //         const day = String(now.getDate()).padStart(2, '0');
// //         return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
// //     }
// //     if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
// //         return new Date(`${input}T00:00:00.000Z`);
// //     }
// //     const d = new Date(input);
// //     const year = d.getFullYear();
// //     const month = String(d.getMonth() + 1).padStart(2, '0');
// //     const day = String(d.getDate()).padStart(2, '0');
// //     return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
// // };

// // // GET - Check if teacher has active delegations for today or specific date
// // export async function GET(req, { params }) {
// //     const { schoolId } = await params;
// //     const { searchParams } = new URL(req.url);

// //     const teacherId = searchParams.get('teacherId');
// //     const date = searchParams.get('date') || null;
// //     const checkDate = ISTDate(date);

// //     if (!teacherId) {
// //         return NextResponse.json({
// //             error: 'teacherId is required'
// //         }, { status: 400 });
// //     }

// //     try {
// //         // Check if teacher is substitute for any class today
// //         const activeDelegations = await prisma.attendanceDelegation.findMany({
// //             where: {
// //                 schoolId,
// //                 substituteTeacherId: teacherId,
// //                 status: 'ACTIVE',
// //                 startDate: { lte: checkDate },
// //                 endDate: { gte: checkDate }
// //             },
// //             include: {
// //                 originalTeacher: {
// //                     select: {
// //                         userId: true,
// //                         name: true,
// //                         employeeId: true,
// //                         user: { select: { profilePicture: true } }
// //                     }
// //                 },
// //                 class: {
// //                     select: {
// //                         id: true,
// //                         className: true,
// //                         _count: {
// //                             select: { students: true }
// //                         }
// //                     }
// //                 },
// //                 section: {
// //                     select: {
// //                         id: true,
// //                         name: true,
// //                         _count: {
// //                             select: { students: true }
// //                         }
// //                     }
// //                 }
// //             },
// //             orderBy: { createdAt: 'desc' }
// //         });

// //         // Also get teacher's own classes
// //         const ownClasses = await prisma.teachingStaff.findUnique({
// //             where: { userId: teacherId },
// //             select: {
// //                 Class: {
// //                     where: { schoolId },
// //                     select: {
// //                         id: true,
// //                         className: true,
// //                         _count: { select: { students: true } }
// //                     }
// //                 },
// //                 sectionsAssigned: {
// //                     where: { schoolId },
// //                     select: {
// //                         id: true,
// //                         name: true,
// //                         classId: true,
// //                         class: { select: { className: true } },
// //                         _count: { select: { students: true } }
// //                     }
// //                 }
// //             }
// //         });

// //         const hasDelegations = activeDelegations.length > 0;

// //         return NextResponse.json({
// //             success: true,
// //             hasDelegations,
// //             date: checkDate.toISOString().split('T')[0],
// //             delegations: activeDelegations.map(d => ({
// //                 id: d.id,
// //                 classId: d.classId,
// //                 className: d.class.className,
// //                 sectionId: d.sectionId,
// //                 sectionName: d.section?.name || null,
// //                 studentCount: d.section ? d.section._count.students : d.class._count.students,
// //                 originalTeacher: {
// //                     id: d.originalTeacher.userId,
// //                     name: d.originalTeacher.name,
// //                     employeeId: d.originalTeacher.employeeId,
// //                     profilePicture: d.originalTeacher.user.profilePicture
// //                 },
// //                 startDate: d.startDate,
// //                 endDate: d.endDate,
// //                 reason: d.reason
// //             })),
// //             ownClasses: {
// //                 classTeacher: ownClasses?.Class || [],
// //                 sections: ownClasses?.sectionsAssigned || []
// //             }
// //         });
// //     } catch (error) {
// //         console.error('Check delegation error:', error);
// //         return NextResponse.json({
// //             error: 'Failed to check delegations',
// //             details: error.message
// //         }, { status: 500 });
// //     }
// // }

// // app/api/schools/[schoolId]/attendance/delegations/check/route.js
// import prisma from '@/lib/prisma';
// import { NextResponse } from 'next/server';
// import crypto from 'crypto';

// const ISTDate = (input) => {
//     if (!input) {
//         const now = new Date();
//         const year = now.getFullYear();
//         const month = String(now.getMonth() + 1).padStart(2, '0');
//         const day = String(now.getDate()).padStart(2, '0');
//         return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
//     }
//     if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
//         return new Date(`${input}T00:00:00.000Z`);
//     }
//     const d = new Date(input);
//     const year = d.getFullYear();
//     const month = String(d.getMonth() + 1).padStart(2, '0');
//     const day = String(d.getDate()).padStart(2, '0');
//     return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
// };

// // Generate version hash for delegation tracking
// const generateDelegationVersion = (delegation) => {
//     // Version includes: id, dates, reason, and updatedAt
//     // This ensures version changes if delegation is modified
//     const versionString = [
//         delegation.id,
//         delegation.startDate.toISOString(),
//         delegation.endDate.toISOString(),
//         delegation.reason || '',
//         delegation.updatedAt.toISOString()
//     ].join('_');

//     return crypto
//         .createHash('md5')
//         .update(versionString)
//         .digest('hex')
//         .substring(0, 12); // Use first 12 chars for shorter version
// };

// // GET - Check if teacher has active delegations for today or specific date
// export async function GET(req, { params }) {
//     const { schoolId } = await params;
//     const { searchParams } = new URL(req.url);

//     const teacherId = searchParams.get('teacherId');
//     const date = searchParams.get('date') || null;
//     const checkDate = ISTDate(date);

//     if (!teacherId) {
//         return NextResponse.json({
//             error: 'teacherId is required'
//         }, { status: 400 });
//     }

//     try {
//         // Check if teacher is substitute for any class today
//         const activeDelegations = await prisma.attendanceDelegation.findMany({
//             where: {
//                 schoolId,
//                 substituteTeacherId: teacherId,
//                 status: 'ACTIVE',
//                 startDate: { lte: checkDate },
//                 endDate: { gte: checkDate }
//             },
//             include: {
//                 originalTeacher: {
//                     select: {
//                         userId: true,
//                         name: true,
//                         employeeId: true,
//                         user: { select: { profilePicture: true } }
//                     }
//                 },
//                 class: {
//                     select: {
//                         id: true,
//                         className: true,
//                         _count: {
//                             select: { students: true }
//                         }
//                     }
//                 },
//                 section: {
//                     select: {
//                         id: true,
//                         name: true,
//                         _count: {
//                             select: { students: true }
//                         }
//                     }
//                 }
//             },
//             orderBy: { createdAt: 'desc' }
//         });

//         // Also get teacher's own classes
//         const ownClasses = await prisma.teachingStaff.findUnique({
//             where: { userId: teacherId },
//             select: {
//                 Class: {
//                     where: { schoolId },
//                     select: {
//                         id: true,
//                         className: true,
//                         _count: { select: { students: true } }
//                     }
//                 },
//                 sectionsAssigned: {
//                     where: { schoolId },
//                     select: {
//                         id: true,
//                         name: true,
//                         classId: true,
//                         class: { select: { className: true } },
//                         _count: { select: { students: true } }
//                     }
//                 }
//             }
//         });

//         const hasDelegations = activeDelegations.length > 0;

//         return NextResponse.json({
//             success: true,
//             hasDelegations,
//             date: checkDate.toISOString().split('T')[0],
//             delegations: activeDelegations.map(d => ({
//                 id: d.id,
//                 classId: d.classId,
//                 className: d.class.className,
//                 sectionId: d.sectionId,
//                 sectionName: d.section?.name || null,
//                 studentCount: d.section ? d.section._count.students : d.class._count.students,
//                 originalTeacher: {
//                     id: d.originalTeacher.userId,
//                     name: d.originalTeacher.name,
//                     employeeId: d.originalTeacher.employeeId,
//                     profilePicture: d.originalTeacher.user.profilePicture
//                 },
//                 startDate: d.startDate,
//                 endDate: d.endDate,
//                 reason: d.reason,
//                 // Add version for tracking changes
//                 version: generateDelegationVersion(d),
//                 createdAt: d.createdAt,
//                 updatedAt: d.updatedAt
//             })),
//             ownClasses: {
//                 classTeacher: ownClasses?.Class || [],
//                 sections: ownClasses?.sectionsAssigned || []
//             }
//         });
//     } catch (error) {
//         console.error('Check delegation error:', error);
//         return NextResponse.json({
//             error: 'Failed to check delegations',
//             details: error.message
//         }, { status: 500 });
//     }
// }

// // POST - Mark delegation as acknowledged by substitute teacher
// export async function POST(req, { params }) {
//     const { schoolId } = await params;

//     try {
//         const body = await req.json();
//         const { teacherId, delegationId } = body;

//         if (!teacherId || !delegationId) {
//             return NextResponse.json({
//                 error: 'teacherId and delegationId are required'
//             }, { status: 400 });
//         }

//         // Verify the delegation exists and belongs to this teacher
//         const delegation = await prisma.attendanceDelegation.findFirst({
//             where: {
//                 id: delegationId,
//                 schoolId,
//                 substituteTeacherId: teacherId,
//                 status: 'ACTIVE'
//             }
//         });

//         if (!delegation) {
//             return NextResponse.json({
//                 error: 'Delegation not found or not authorized'
//             }, { status: 404 });
//         }

//         // Update acknowledgment timestamp
//         await prisma.attendanceDelegation.update({
//             where: { id: delegationId },
//             data: { acknowledgedAt: new Date() }
//         });

//         return NextResponse.json({
//             success: true,
//             message: 'Delegation acknowledged'
//         });

//     } catch (error) {
//         console.error('Acknowledge delegation error:', error);
//         return NextResponse.json({
//             error: 'Failed to acknowledge delegation',
//             details: error.message
//         }, { status: 500 });
//     }
// }
// app/api/schools/[schoolId]/attendance/delegations/check/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const ISTDate = (input) => {
    if (!input) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    }
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return new Date(`${input}T00:00:00.000Z`);
    }
    const d = new Date(input);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
};

// Generate version hash for delegation tracking
const generateDelegationVersion = (delegation) => {
    // Version includes: id, dates, reason, and updatedAt
    // This ensures version changes if delegation is modified
    const versionString = [
        delegation.id,
        delegation.startDate.toISOString(),
        delegation.endDate.toISOString(),
        delegation.reason || '',
        delegation.updatedAt.toISOString()
    ].join('_');

    return crypto
        .createHash('md5')
        .update(versionString)
        .digest('hex')
        .substring(0, 12); // Use first 12 chars for shorter version
};

// GET - Check if teacher has active delegations for today or specific date
export async function GET(req, { params }) {
    const { schoolId } = await params;
    const { searchParams } = new URL(req.url);

    const teacherId = searchParams.get('teacherId');
    const date = searchParams.get('date') || null;
    const checkDate = ISTDate(date);

    if (!teacherId) {
        return NextResponse.json({
            error: 'teacherId is required'
        }, { status: 400 });
    }

    try {
        // Check if teacher is substitute for any class today
        const activeDelegations = await prisma.attendanceDelegation.findMany({
            where: {
                schoolId,
                substituteTeacherId: teacherId,
                status: 'ACTIVE',
                startDate: { lte: checkDate },
                endDate: { gte: checkDate }
            },
            include: {
                originalTeacher: {
                    select: {
                        userId: true,
                        name: true,
                        employeeId: true,
                        user: { select: { profilePicture: true } }
                    }
                },
                class: {
                    select: {
                        id: true,
                        className: true,
                        _count: {
                            select: { students: true }
                        }
                    }
                },
                section: {
                    select: {
                        id: true,
                        name: true,
                        _count: {
                            select: { students: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Also get teacher's own classes
        const ownClasses = await prisma.teachingStaff.findUnique({
            where: { userId: teacherId },
            select: {
                Class: {
                    where: { schoolId },
                    select: {
                        id: true,
                        className: true,
                        _count: { select: { students: true } }
                    }
                },
                sectionsAssigned: {
                    where: { schoolId },
                    select: {
                        id: true,
                        name: true,
                        classId: true,
                        class: { select: { className: true } },
                        _count: { select: { students: true } }
                    }
                }
            }
        });

        const hasDelegations = activeDelegations.length > 0;

        return NextResponse.json({
            success: true,
            hasDelegations,
            date: checkDate.toISOString().split('T')[0],
            delegations: activeDelegations.map(d => ({
                id: d.id,
                classId: d.classId,
                className: d.class.className,
                sectionId: d.sectionId,
                sectionName: d.section?.name || null,
                studentCount: d.section ? d.section._count.students : d.class._count.students,
                originalTeacher: {
                    id: d.originalTeacher.userId,
                    name: d.originalTeacher.name,
                    employeeId: d.originalTeacher.employeeId,
                    profilePicture: d.originalTeacher.user.profilePicture
                },
                startDate: d.startDate,
                endDate: d.endDate,
                reason: d.reason,
                // Add version for tracking changes
                version: generateDelegationVersion(d),
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
                acknowledgedAt: d.acknowledgedAt // Include acknowledgment status
            })),
            ownClasses: {
                classTeacher: ownClasses?.Class || [],
                sections: ownClasses?.sectionsAssigned || []
            }
        });
    } catch (error) {
        console.error('Check delegation error:', error);
        return NextResponse.json({
            error: 'Failed to check delegations',
            details: error.message
        }, { status: 500 });
    }
}

// POST - Mark delegation as acknowledged by substitute teacher
export async function POST(req, { params }) {
    const { schoolId } = await params;

    try {
        const body = await req.json();
        const { teacherId, delegationId } = body;

        if (!teacherId || !delegationId) {
            return NextResponse.json({
                error: 'teacherId and delegationId are required'
            }, { status: 400 });
        }

        // Verify the delegation exists and belongs to this teacher
        const delegation = await prisma.attendanceDelegation.findFirst({
            where: {
                id: delegationId,
                schoolId,
                substituteTeacherId: teacherId,
                status: 'ACTIVE'
            }
        });

        if (!delegation) {
            return NextResponse.json({
                error: 'Delegation not found or not authorized'
            }, { status: 404 });
        }

        // Update acknowledgment timestamp
        await prisma.attendanceDelegation.update({
            where: { id: delegationId },
            data: { acknowledgedAt: new Date() }
        });

        return NextResponse.json({
            success: true,
            message: 'Delegation acknowledged'
        });

    } catch (error) {
        console.error('Acknowledge delegation error:', error);
        return NextResponse.json({
            error: 'Failed to acknowledge delegation',
            details: error.message
        }, { status: 500 });
    }
}