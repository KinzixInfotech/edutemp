import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

export async function PUT(req, { params }) {
    const { role, id } = params
    try {
        const data = await req.json()
        const update = (model) =>
            prisma[model].update({ where: { id }, data })

        switch (role) {
            case "teacher":
                return NextResponse.json(await update("teacher"))
            case "student":
                return NextResponse.json(await update("student"))
            case "parent":
                return NextResponse.json(await update("parent"))
            case "accountant":
                return NextResponse.json(await update("accountant"))
            case "librarian":
                return NextResponse.json(await update("librarian"))
            case "peon":
                return NextResponse.json(await update("peon"))
            case "busDrivers":
                return NextResponse.json(await update("busDriver"))
            case "labAssistants":
                return NextResponse.json(await update("labAssistant"))
            default:
                return NextResponse.json({ error: "Invalid role" }, { status: 400 })
        }
    } catch (err) {
        console.error("[PROFILE_UPDATE]", err)
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }
}
