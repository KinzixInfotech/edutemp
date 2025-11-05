// app/api/documents/[schoolId]/admitcards/[id]/route.js

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(request, { params }) {
    try {
        const { schoolId, id } = params;

        // Check if admit card exists
        const admitCard = await prisma.admitCard.findFirst({
            where: {
                id,
                schoolId,
            },
        });

        if (!admitCard) {
            return NextResponse.json(
                { error: 'Admit card not found' },
                { status: 404 }
            );
        }

        // Delete the admit card
        await prisma.admitCard.delete({
            where: { id },
        });

        // TODO: Also delete the PDF file from storage if needed
        // await deleteFile(admitCard.fileUrl);

        return NextResponse.json({
            message: 'Admit card deleted successfully',
            id,
        });

    } catch (error) {
        console.error('Error deleting admit card:', error);
        return NextResponse.json(
            { error: 'Failed to delete admit card', message: error.message },
            { status: 500 }
        );
    }
}

export async function GET(request, { params }) {
    try {
        const { schoolId, id } = params;

        // Fetch admit card details
        const admitCard = await prisma.admitCard.findFirst({
            where: {
                id,
                schoolId,
            },
            include: {
                student: {
                    select: {
                        userId: true,
                        name: true,
                        email: true,
                        rollNumber: true,
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
                        title: true,
                    },
                },
            },
        });

        if (!admitCard) {
            return NextResponse.json(
                { error: 'Admit card not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(admitCard);

    } catch (error) {
        console.error('Error fetching admit card:', error);
        return NextResponse.json(
            { error: 'Failed to fetch admit card', message: error.message },
            { status: 500 }
        );
    }
}