import { NextResponse } from "next/server"
import { z } from "zod"
import {
    createTeacher,
    createStudent,
    createParent,
    createAccountant,
    createLibrarian,
    createPeon,
    createDriver,
    createLabAssistant,
} from "./handlers"

const baseSchema = z.object({
    role: z.enum([
        "teacher",
        "student",
        "parent",
        "accountant",
        "librarian",
        "peon",
        "driver",
        "lab",
    ]),
    schoolId: z.string().uuid(),
})

export async function POST(req) {
    try {
        const body = await req.json()
        const { role, schoolId, ...rest } = baseSchema.parse(body)

        switch (role) {
            case "teacher":
                return await createTeacher(schoolId, rest)
            case "student":
                return await createStudent(schoolId, rest)
            case "parent":
                return await createParent(schoolId, rest)
            case "accountant":
                return await createAccountant(schoolId, rest)
            case "librarian":
                return await createLibrarian(schoolId, rest)
            case "peon":
                return await createPeon(schoolId, rest)
            case "driver":
                return await createDriver(schoolId, rest)
            case "lab":
                return await createLabAssistant(schoolId, rest)
            default:
                return NextResponse.json({ error: "Invalid role" }, { status: 400 })
        }

    } catch (err) {
        console.error("[MANAGE_CREATE]", err)
        return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
    }
}
