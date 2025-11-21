// app/api/schools/syllabus/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { notifySyllabusToClass, notifySyllabusToTeachers, notifySyllabusUploaded } from "@/lib/notifications/notificationHelper";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    const classId = searchParams.get("classId");
    const academicYearId = searchParams.get("academicYearId");

    if (!schoolId) {
        return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    try {
        const where = { schoolId };
        if (classId) where.classId = parseInt(classId);
        if (academicYearId) where.academicYearId = academicYearId;

        const syllabi = await prisma.syllabus.findMany({
            where,
            include: {
                Class: {
                    include: {
                        sections: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    }
                },
                AcademicYear: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                    }
                },
            },
            orderBy: {
                uploadedAt: 'desc'
            }
        });

        return NextResponse.json({
            success: true,
            syllabi,
            total: syllabi.length
        });
    } catch (error) {
        console.error("Fetch syllabi error:", error);
        return NextResponse.json({ error: "Failed to fetch syllabi" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { fileUrl, schoolId, classId, academicYearId, fileName, senderId } = body;

        if (!fileUrl || !schoolId || !classId) {
            return NextResponse.json(
                { error: "fileUrl, schoolId, and classId are required" },
                { status: 400 }
            );
        }

        // Get active academic year if not provided
        let finalAcademicYearId = academicYearId;

        if (!finalAcademicYearId) {
            const activeYear = await prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
            });
            if (activeYear) finalAcademicYearId = activeYear.id;
        }

        // Check if syllabus already exists for this class
        const existing = await prisma.syllabus.findFirst({
            where: {
                schoolId,
                classId: parseInt(classId),
                academicYearId: finalAcademicYearId,
            }
        });

        let syllabus;
        let isUpdate = false;

        if (existing) {
            // Update existing syllabus
            syllabus = await prisma.syllabus.update({
                where: { id: existing.id },
                data: {
                    fileUrl,
                    filename: fileName,
                    uploadedAt: new Date(),
                },
                include: {
                    Class: {
                        include: {
                            sections: true
                        }
                    },
                    AcademicYear: true,
                    School: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                },
            });
            isUpdate = true;
        } else {
            // Create new syllabus
            syllabus = await prisma.syllabus.create({
                data: {
                    filename: fileName,
                    fileUrl,
                    schoolId,
                    classId: parseInt(classId),
                    academicYearId: finalAcademicYearId,
                },
                include: {
                    Class: {
                        include: {
                            sections: true
                        }
                    },
                    AcademicYear: true,
                    School: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                },
            });
        }

        // Send notification to all students teacehr and parents in the class
        try {
            await notifySyllabusToClass({
                schoolId,
                classId: parseInt(classId),
                className: syllabus.Class.className,
                senderId: senderId || null,
                fileName: fileName || 'New syllabus document'
            });

        } catch (notifError) {
            console.error('Notification error:', notifError);
            // Don't fail the request if notification fails
        }

        return NextResponse.json({
            success: true,
            syllabus,
            message: isUpdate ? "Syllabus updated successfully" : "Syllabus uploaded successfully"
        }, { status: 201 });
    } catch (error) {
        console.error("Create syllabus error:", error);
        return NextResponse.json(
            { error: "Failed to create syllabus" },
            { status: 500 }
        );
    }
}

export async function DELETE(req) {
    const body = await req.json();
    const { id } = body;

    if (!id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    try {
        await prisma.syllabus.delete({ where: { id } });
        return NextResponse.json({
            success: true,
            message: "Syllabus deleted successfully"
        });
    } catch (error) {
        console.error("Delete syllabus error:", error);
        return NextResponse.json({ error: "Failed to delete syllabus" }, { status: 500 });
    }
}