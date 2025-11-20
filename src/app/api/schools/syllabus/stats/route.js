import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// app/api/schools/syllabus/stats/route.js
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
        return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    try {
        const [totalSyllabi, classesWithSyllabus, recentUploads, activeYear] = await Promise.all([
            prisma.syllabus.count({ where: { schoolId } }),
            prisma.syllabus.groupBy({
                by: ['classId'],
                where: { schoolId },
                _count: true,
            }),
            prisma.syllabus.findMany({
                where: { schoolId },
                orderBy: { uploadedAt: 'desc' },
                take: 5,
                include: {
                    Class: {
                        select: {
                            className: true
                        }
                    }
                }
            }),
            prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
            })
        ]);

        const totalClasses = await prisma.class.count({
            where: { schoolId }
        });

        return NextResponse.json({
            success: true,
            stats: {
                totalSyllabi,
                classesWithSyllabus: classesWithSyllabus.length,
                totalClasses,
                coverage: totalClasses > 0 ? ((classesWithSyllabus.length / totalClasses) * 100).toFixed(1) : 0,
                recentUploads: recentUploads.map(s => ({
                    id: s.id,
                    className: s.Class.className,
                    uploadedAt: s.uploadedAt,
                })),
                academicYear: activeYear?.name || 'N/A'
            }
        });
    } catch (error) {
        console.error("Fetch stats error:", error);
        return NextResponse.json({ error: "Failed to fetch statistics" }, { status: 500 });
    }
}
