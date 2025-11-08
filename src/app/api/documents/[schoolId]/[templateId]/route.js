// app/api/documents/[schoolId]/[templateId]/route.js
import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function PUT(request, props) {
  const params = await props.params;
  const { schoolId, templateId } = params;
  const body = await request.json();

  try {
    if (!schoolId || !templateId) {
      return NextResponse.json({ error: 'School ID and Template ID are required' }, { status: 400 });
    }

    const template = await prisma.certificateTemplate.update({
      where: { id: templateId },
      data: body,
      include: { school: { select: { name: true } } },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, props) {
  const params = await props.params;
  const { schoolId, templateId } = params;

  try {
    if (!schoolId || !templateId) {
      return NextResponse.json({ error: 'School ID and Template ID are required' }, { status: 400 });
    }

    await prisma.certificateTemplate.delete({
      where: { id: templateId },
    });

    return NextResponse.json({ message: 'Template deleted' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}