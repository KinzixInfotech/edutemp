import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializeSignatureAsset } from '@/lib/document-signature-library';

export const GET = withSchoolAccess(async function GET(request, props) {
  const params = await props.params;
  try {
    const { schoolId } = params;

    const [school, signatures] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        QrVerificationSettings: true,
        PdfExportSettings: true
      }
    }),
    prisma.signature.findMany({
      where: {
        schoolId,
        isActive: true
      },
      include: {
        teacher: {
          select: {
            userId: true,
            name: true,
            employeeId: true
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
            name: true,
            classId: true
          }
        }
      },
      orderBy: [
      { isDefault: 'desc' },
      { updatedAt: 'desc' }]

    })]
    );

    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const principalSignature = signatures.find((signature) => signature.placeholderKey === 'principalSignature' && signature.isDefault) ||
    signatures.find((signature) => signature.placeholderKey === 'principalSignature') ||
    null;

    return NextResponse.json({
      signatureUrl: school.signatureUrl || principalSignature?.imageUrl || null,
      stampUrl: school.stampUrl,
      qrSettings: school.QrVerificationSettings,
      pdfSettings: school.PdfExportSettings,
      signatures: signatures.map(serializeSignatureAsset)
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
});

export const PATCH = withSchoolAccess(async function PATCH(request, props) {
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
});