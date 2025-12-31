import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

// 👉 Update academic year status
// 👉 Update academic year status or details
export async function PATCH(req, props) {
    const params = await props.params;
    const { id } = params
    try {
        const body = await req.json()
        const {
            isActive,
            name,
            startDate,
            endDate,
            // Setup tracking fields
            setupComplete,
            classesConfigured,
            studentsPromoted,
            feesConfigured,
            subjectsConfigured,
            timetableConfigured
        } = body

        const year = await prisma.academicYear.findUnique({
            where: { id },
        })

        if (!year) {
            return NextResponse.json({ error: "Academic year not found" }, { status: 404 })
        }

        const updateData = {};

        // Handle Status Change
        if (typeof isActive === "boolean") {
            if (isActive) {
                // Deactivate all other academic years in the same school
                await prisma.academicYear.updateMany({
                    where: {
                        schoolId: year.schoolId,
                        NOT: { id: year.id },
                    },
                    data: { isActive: false },
                })
            }
            updateData.isActive = isActive;
        }

        // Handle Details Update
        if (name) updateData.name = name;
        if (startDate) updateData.startDate = new Date(startDate);
        if (endDate) updateData.endDate = new Date(endDate);

        // Handle Setup Tracking Fields
        if (typeof setupComplete === "boolean") updateData.setupComplete = setupComplete;
        if (typeof classesConfigured === "boolean") updateData.classesConfigured = classesConfigured;
        if (typeof studentsPromoted === "boolean") updateData.studentsPromoted = studentsPromoted;
        if (typeof feesConfigured === "boolean") updateData.feesConfigured = feesConfigured;
        if (typeof subjectsConfigured === "boolean") updateData.subjectsConfigured = subjectsConfigured;
        if (typeof timetableConfigured === "boolean") updateData.timetableConfigured = timetableConfigured;

        const updatedYear = await prisma.academicYear.update({
            where: { id },
            data: updateData,
        })

        return NextResponse.json(updatedYear)
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: "Failed to update academic year" }, { status: 500 })
    }
}

// 👉 Delete academic year
export async function DELETE(req, props) {
    const params = await props.params;
    const { id } = params
    try {
        await prisma.academicYear.delete({
            where: { id },
        })

        return NextResponse.json({ message: "Academic year deleted successfully" })
    } catch (err) {
        console.error(err)
        if (err.code === "P2025") {
            return NextResponse.json({ error: "Academic year not found" }, { status: 404 })
        } else if (err.code === "P2003") {
            return NextResponse.json({ error: "Cannot delete academic year with dependencies (e.g., students, classes, fees)" }, { status: 400 })
        }
        return NextResponse.json({ error: "Failed to delete academic year" }, { status: 500 })
    }
}