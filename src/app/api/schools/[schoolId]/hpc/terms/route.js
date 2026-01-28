import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Fetch term lock status
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { academicYearId } = searchParams;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const terms = [
            { number: 1, name: "Term 1" },
            { number: 2, name: "Term 2" }
        ];

        // If no academic year, return default unlocked status
        if (!academicYearId) {
            return NextResponse.json({
                terms: terms.map(t => ({ ...t, locked: false, progress: 0 }))
            });
        }

        // Fetch lock status from DB
        const locks = await prisma.termLock.findMany({
            where: {
                schoolId,
                academicYearId // UUID, no conversion needed
            }
        });

        const result = terms.map(t => {
            const lock = locks.find(l => l.termNumber === t.number);
            return {
                ...t,
                locked: lock?.isLocked || false,
                progress: 0 // TODO: Calculate actual progress if needed
            };
        });

        return NextResponse.json({ terms: result });
    } catch (err) {
        console.error("Error fetching term status:", err);
        return NextResponse.json(
            { error: "Failed to fetch term status", message: err.message },
            { status: 500 }
        );
    }
}

// POST - Toggle term lock
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { academicYearId, termNumber, locked } = body;

    if (!schoolId || !academicYearId || !termNumber) {
        return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
        );
    }

    try {
        const termLock = await prisma.termLock.upsert({
            where: {
                schoolId_academicYearId_termNumber: {
                    schoolId,
                    academicYearId: academicYearId, // UUID
                    termNumber: Number(termNumber)
                }
            },
            update: { isLocked: locked },
            create: {
                schoolId,
                academicYearId: academicYearId, // UUID
                termNumber: Number(termNumber),
                isLocked: locked
            }
        });

        return NextResponse.json({
            message: `Term ${termNumber} ${locked ? "locked" : "unlocked"} successfully`,
            termLock
        });
    } catch (err) {
        console.error("Error updating term lock:", err);
        return NextResponse.json(
            { error: "Failed to update term lock", message: err.message },
            { status: 500 }
        );
    }
}
