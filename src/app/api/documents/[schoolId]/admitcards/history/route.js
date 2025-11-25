// import { NextResponse } from 'next/server';
// import prisma from '@/lib/prisma';

// export async function GET(request, { params }) {
//     try {
//         const { schoolId } = params;
//         const { searchParams } = new URL(request.url);
//         const examId = searchParams.get('examId');

//         const whereClause = {
//             schoolId,
//             ...(examId && examId !== 'all' && { examId: examId }),
//         };

//         const admitCards = await prisma.admitCard.findMany({
//             where: whereClause,
//             include: {
//                 student: {
//                     select: {
//                         name: true,
//                         email: true,
//                         rollNumber: true,
//                         admissionNo: true,
//                         class: {
//                             select: {
//                                 className: true,
//                             },
//                         },
//                         section: {
//                             select: {
//                                 name: true,
//                             },
//                         },
//                     },
//                 },
//                 exam: {
//                     select: {
//                         id: true,
//                         title: true,
//                     },
//                 },
//             },
//             orderBy: {
//                 issueDate: 'desc',
//             },
//         });

//         return NextResponse.json(admitCards);
//     } catch (error) {
//         console.error('Error fetching admit cards history:', error);
//         return NextResponse.json(
//             { error: 'Failed to fetch admit cards', message: error.message },
//             { status: 500 }
//         );
//     }
// }
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(request.url);
        const examId = searchParams.get('examId');

        const whereClause = {
            schoolId,
            ...(examId && examId !== 'all' && { examId: examId }),
        };

        const admitCards = await prisma.admitCard.findMany({
            where: whereClause,
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
                        rollNumber: true,
                        admissionNo: true,
                        class: {
                            select: {
                                className: true,
                            },
                        },
                        section: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                exam: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: {
                issueDate: 'desc',
            },
        });

        return NextResponse.json(admitCards);
    } catch (error) {
        console.error('Error fetching admit cards history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch admit cards', message: error.message },
            { status: 500 }
        );
    }
}