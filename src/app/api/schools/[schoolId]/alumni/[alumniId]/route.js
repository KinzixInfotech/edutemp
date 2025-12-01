import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Get single alumni details
export async function GET(req, { params }) {
    const { schoolId, alumniId } = await params;

    try {
        const alumni = await prisma.alumni.findFirst({
            where: {
                id: alumniId,
                schoolId
            },
            include: {
                lastClass: {
                    select: {
                        className: true
                    }
                },
                lastSection: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!alumni) {
            return NextResponse.json(
                { error: 'Alumni not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(alumni);

    } catch (error) {
        console.error('Error fetching alumni:', error);
        return NextResponse.json(
            { error: 'Failed to fetch alumni', details: error.message },
            { status: 500 }
        );
    }
}

// PUT - Update alumni information
export async function PUT(req, { params }) {
    const { schoolId, alumniId } = await params;

    try {
        const body = await req.json();
        const {
            currentAddress,
            currentCity,
            currentState,
            currentCountry,
            currentEmail,
            currentPhone,
            currentOccupation,
            currentCompany,
            higherEducation,
            achievements,
            willingToMentor,
            canContact
        } = body;

        const alumni = await prisma.alumni.update({
            where: {
                id: alumniId,
                schoolId
            },
            data: {
                ...(currentAddress !== undefined && { currentAddress }),
                ...(currentCity !== undefined && { currentCity }),
                ...(currentState !== undefined && { currentState }),
                ...(currentCountry !== undefined && { currentCountry }),
                ...(currentEmail !== undefined && { currentEmail }),
                ...(currentPhone !== undefined && { currentPhone }),
                ...(currentOccupation !== undefined && { currentOccupation }),
                ...(currentCompany !== undefined && { currentCompany }),
                ...(higherEducation !== undefined && { higherEducation }),
                ...(achievements !== undefined && { achievements }),
                ...(willingToMentor !== undefined && { willingToMentor }),
                ...(canContact !== undefined && { canContact })
            }
        });

        return NextResponse.json({
            success: true,
            alumni
        });

    } catch (error) {
        console.error('Error updating alumni:', error);
        return NextResponse.json(
            { error: 'Failed to update alumni', details: error.message },
            { status: 500 }
        );
    }
}

// DELETE - Delete alumni record (admin only, rare use case)
export async function DELETE(req, { params }) {
    const { schoolId, alumniId } = await params;

    try {
        await prisma.alumni.delete({
            where: {
                id: alumniId,
                schoolId
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Alumni record deleted'
        });

    } catch (error) {
        console.error('Error deleting alumni:', error);
        return NextResponse.json(
            { error: 'Failed to delete alumni', details: error.message },
            { status: 500 }
        );
    }
}