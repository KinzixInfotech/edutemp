import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"


export async function GET(request, props) {
    const params = await props.params;
    const { schoolId } = params
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || 'student'

    try {
        let data = []

        switch (role) {
            case 'student':
                data = await prisma.student.findMany({
                    where: { schoolId },
                    include: {
                        class: true,
                        section: true,
                        user: { select: { profilePicture: true, createdAt: true } },
                    },
                })
                break
            case 'teachingStaff':
                data = await prisma.teachingStaff.findMany({
                    where: { schoolId },
                    include: {
                        department: true,
                        user: { select: { profilePicture: true, createdAt: true } },
                    },
                })
                break
            case 'nonTeachingStaff':
                data = await prisma.nonTeachingStaff.findMany({
                    where: { schoolId },
                    include: {
                        department: true,
                        user: { select: { profilePicture: true, createdAt: true } },
                    },
                })
                break
            case 'parent':
                data = await prisma.parent.findMany({
                    where: { schoolId },
                    include: {
                        user: { select: { profilePicture: true, createdAt: true } },
                        studentLinks: {
                            include: { student: { select: { name: true, admissionNo: true } } },
                        },
                    },
                })
                break
            case 'accountant':
                data = await prisma.accountant.findMany({
                    where: { schoolId },
                    include: {
                        user: { select: { profilePicture: true, createdAt: true, name: true, email: true } },
                    },
                })
                break
            case 'librarian':
                data = await prisma.librarian.findMany({
                    where: { schoolId },
                    include: {
                        user: { select: { profilePicture: true, createdAt: true, name: true, email: true } },
                    },
                })
                break
            case 'transportStaff':
                data = await prisma.transportStaff.findMany({
                    where: { schoolId },
                    include: {
                        user: { select: { profilePicture: true, createdAt: true, name: true, email: true } },
                    },
                })
                break
            default:
                data = []
        }

        return NextResponse.json({ profiles: data })
    } catch (err) {
        console.error("[PROFILES_FETCH]", err)
        return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
    }
}
