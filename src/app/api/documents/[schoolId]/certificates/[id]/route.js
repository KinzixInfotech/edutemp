import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Fetch single certificate
export async function GET(request, { params }) {
    try {
        const { schoolId, id } = params;

        const certificate = await prisma.certificateGenerated.findFirst({
            where: {
                id,
                schoolId,
            },
            include: {
                student: {
                    select: {
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
                template: {
                    select: {
                        name: true,
                        type: true,
                        description: true,
                    },
                },
                issuedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!certificate) {
            return NextResponse.json(
                { error: 'Certificate not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(certificate);
    } catch (error) {
        console.error('Error fetching certificate:', error);
        return NextResponse.json(
            { error: 'Failed to fetch certificate' },
            { status: 500 }
        );
    }
}

// DELETE - Delete certificate
export async function DELETE(request, { params }) {
    try {
        const { schoolId, id } = params;

        const certificate = await prisma.certificateGenerated.findFirst({
            where: {
                id,
                schoolId,
            },
        });

        if (!certificate) {
            return NextResponse.json(
                { error: 'Certificate not found' },
                { status: 404 }
            );
        }

        // Soft delete by updating status
        await prisma.certificateGenerated.update({
            where: { id },
            data: { status: 'revoked' },
        });

        return NextResponse.json({ message: 'Certificate deleted successfully' });
    } catch (error) {
        console.error('Error deleting certificate:', error);
        return NextResponse.json(
            { error: 'Failed to delete certificate' },
            { status: 500 }
        );
    }
}