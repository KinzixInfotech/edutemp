
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const settings = await prisma.schoolSettings.findUnique({
            where: { schoolId },
        });

        return NextResponse.json(settings || {});
    } catch (error) {
        console.error("Error fetching settings:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();

    try {
        const settings = await prisma.schoolSettings.upsert({
            where: { schoolId },
            update: {
                admissionNoPrefix: body.admissionNoPrefix,
                employeeIdPrefix: body.employeeIdPrefix,
                // Location fields
                ...(body.schoolLatitude !== undefined && { schoolLatitude: body.schoolLatitude }),
                ...(body.schoolLongitude !== undefined && { schoolLongitude: body.schoolLongitude }),
                ...(body.geofenceRadius !== undefined && { geofenceRadius: body.geofenceRadius }),
                ...(body.attendanceRadius !== undefined && { attendanceRadius: body.attendanceRadius }),
            },
            create: {
                schoolId,
                admissionNoPrefix: body.admissionNoPrefix,
                employeeIdPrefix: body.employeeIdPrefix,
                // Location fields
                schoolLatitude: body.schoolLatitude ?? null,
                schoolLongitude: body.schoolLongitude ?? null,
                geofenceRadius: body.geofenceRadius ?? 200,
                attendanceRadius: body.attendanceRadius ?? 500,
            },
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error("Error updating settings:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
