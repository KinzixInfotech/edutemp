import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;

        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            include: {
                QrVerificationSettings: true,
                PdfExportSettings: true,
                // Stamps and Signatures are fetched separately usually or can be included if 1:1, but they are 1:Many.
                // We will return school generic settings here.
            }
        });

        if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

        return NextResponse.json({
            signatureUrl: school.signatureUrl,
            stampUrl: school.stampUrl,
            qrSettings: school.QrVerificationSettings,
            pdfSettings: school.PdfExportSettings
        });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function PATCH(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await request.json();

        // Handle Signature & Stamp Updates
        if (body.signatureUrl !== undefined || body.stampUrl !== undefined) {
            await prisma.school.update({
                where: { id: schoolId },
                data: {
                    ...(body.signatureUrl !== undefined && { signatureUrl: body.signatureUrl }),
                    ...(body.stampUrl !== undefined && { stampUrl: body.stampUrl })
                }
            });
        }

        // Handle QR Settings
        if (body.qrSettings) {
            await prisma.qrVerificationSettings.upsert({
                where: { schoolId },
                create: {
                    schoolId,
                    ...body.qrSettings
                },
                update: {
                    ...body.qrSettings
                }
            });
        }

        // Handle PDF Settings
        if (body.pdfSettings) {
            await prisma.pdfExportSettings.upsert({
                where: { schoolId },
                create: {
                    schoolId,
                    ...body.pdfSettings
                },
                update: {
                    ...body.pdfSettings
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Settings update failed:", error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
