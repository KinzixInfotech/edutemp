import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Fetch form details and fields
export async function GET(req, { params }) {
    const { schoolId, formId } = await params;

    try {
        const form = await prisma.form.findUnique({
            where: { id: formId, schoolId },
            include: {
                fields: {
                    orderBy: { order: "asc" },
                },
            },
        });

        if (!form) {
            return NextResponse.json({ error: "Form not found" }, { status: 404 });
        }

        return NextResponse.json(form);
    } catch (error) {
        console.error("Error fetching form:", error);
        return NextResponse.json(
            { error: "Failed to fetch form" },
            { status: 500 }
        );
    }
}

// PUT: Update form details and fields
export async function PUT(req, { params }) {
    const { schoolId, formId } = await params;

    try {
        const body = await req.json();
        const { title, description, category, status, settings, fields } = body;

        // Update Form Basic Details
        const updatedForm = await prisma.form.update({
            where: { id: formId, schoolId },
            data: {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(category && { category }),
                ...(status && { status }),
                ...(settings && { settings }),
            },
        });

        // Update Fields if provided
        if (fields && Array.isArray(fields)) {
            // Transaction to replace fields
            // Note: A smarter diffing strategy could be used, but replacing is simpler for now
            // However, to preserve data, we should update existing fields by ID if possible
            // But since we wiped data, we can just delete and recreate for now or try to upsert

            // For simplicity in this builder, we'll delete all fields and recreate them
            // WARNING: This deletes data for existing submissions if we had any linked to fields directly
            // But Application data is JSON, so it's fine.

            await prisma.$transaction(async (tx) => {
                await tx.formField.deleteMany({
                    where: { formId },
                });

                if (fields.length > 0) {
                    await tx.formField.createMany({
                        data: fields.map((field, index) => ({
                            formId,
                            name: field.name || `Field ${index + 1}`,
                            type: field.type,
                            required: field.required || false,
                            options: field.options || null,
                            order: index,
                        })),
                    });
                }
            });
        }

        return NextResponse.json(updatedForm);
    } catch (error) {
        console.error("Error updating form:", error);
        return NextResponse.json(
            { error: "Failed to update form" },
            { status: 500 }
        );
    }
}

// DELETE: Delete form
export async function DELETE(req, { params }) {
    const { schoolId, formId } = await params;

    try {
        await prisma.form.delete({
            where: { id: formId, schoolId },
        });

        return NextResponse.json({ message: "Form deleted successfully" });
    } catch (error) {
        console.error("Error deleting form:", error);
        return NextResponse.json(
            { error: "Failed to delete form" },
            { status: 500 }
        );
    }
}
