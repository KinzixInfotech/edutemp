import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { remember, delCache, generateKey } from "@/lib/cache"

// 👉 Create new academic year
export async function POST(req) {
    try {
        const body = await req.json()
        const { name, startDate, endDate, schoolId, isActive } = body
        console.log(body);

        if (!name || !startDate || !endDate) {
            return NextResponse.json({ error: "All fields required" }, { status: 400 })
        } else if (!schoolId) {
            return NextResponse.json({ error: "Schoool id is missing" }, { status: 400 })
        }

        // Check if academic year with same name exists for this school
        const existingYear = await prisma.academicYear.findFirst({
            where: {
                name,
                schoolId
            }
        })

        if (existingYear) {
            return NextResponse.json({ error: "Academic year with this name already exists" }, { status: 409 })
        }

        // If isActive is true, deactivate all other academic years for this school first
        if (isActive) {
            await prisma.academicYear.updateMany({
                where: { schoolId, isActive: true },
                data: { isActive: false },
            })
        }

        const academicYear = await prisma.academicYear.create({
            data: {
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isActive: isActive || false,
                school: { connect: { id: schoolId } },
            },
        })

        // Invalidate cache for this school's academic years
        const cacheKey = generateKey('academic-years', { schoolId });
        await delCache(cacheKey);

        return NextResponse.json(academicYear)
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: "Failed to create academic year" }, { status: 500 })
    }
}

// 👉 List academic years
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url)
        const schoolId = searchParams.get("schoolId") // optional
        if (!schoolId) {
            return NextResponse.json({ error: "Schoool id is missing" }, { status: 400 })
        }

        const cacheKey = generateKey('academic-years', { schoolId });

        const academicYears = await remember(cacheKey, async () => {
            return await prisma.academicYear.findMany({
                orderBy: { createdAt: "desc" },
                where: { schoolId },
                include: {
                    _count: true
                }
            })
        }, 3600 * 24); // Cache for 24 hours as this rarely changes

        return NextResponse.json(academicYears)
    } catch (err) {
        console.error("Error fetching academic years:", err)
        return NextResponse.json(
            { error: "Failed to fetch academic years" },
            { status: 500 }
        )
    }
}