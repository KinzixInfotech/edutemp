import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function createTeacher(schoolId, data) {
    const teacher = await prisma.teacher.create({
        data: {
            schoolId,
            name: data.name,
            email: data.email,
            dob: data.dob,
            bloodGroup: data.bloodGroup,
            assignedClass: data.assignedClass,
            certificates: { set: data.certificates || [] },
        }
    })
    return NextResponse.json(teacher)
}

export async function createStudent(schoolId, data) {
    const student = await prisma.student.create({
        data: {
            schoolId,
            name: data.name,
            class: data.class,
            location: data.location,
            dob: data.dob,
            bloodGroup: data.bloodGroup,
            results: { set: data.results || [] },
            teacher: { connect: { id: data.teacherId } },
        }
    })
    return NextResponse.json(student)
}

export async function createParent(schoolId, data) {
    const parent = await prisma.parent.create({
        data: {
            schoolId,
            fatherName: data.fatherName,
            motherName: data.motherName,
            studentId: data.studentId,
        }
    })
    return NextResponse.json(parent)
}

export async function createAccountant(schoolId, data) {
    const accountant = await prisma.accountant.create({
        data: {
            schoolId,
            name: data.name,
            dob: data.dob,
            mobile: data.mobile,
            email: data.email,
            bloodGroup: data.bloodGroup,
            certificates: { set: data.certificates || [] },
        }
    })
    return NextResponse.json(accountant)
}

export async function createLibrarian(schoolId, data) {
    const librarian = await prisma.librarian.create({
        data: {
            schoolId,
            name: data.name,
            email: data.email,
            dob: data.dob,
            location: data.location,
            bloodGroup: data.bloodGroup,
        }
    })
    return NextResponse.json(librarian)
}

export async function createPeon(schoolId, data) {
    const peon = await prisma.peon.create({
        data: {
            schoolId,
            name: data.name,
            email: data.email,
            address: data.address,
            bloodGroup: data.bloodGroup,
            role: data.peonRole,
        }
    })
    return NextResponse.json(peon)
}

export async function createDriver(schoolId, data) {
    const driver = await prisma.driver.create({
        data: {
            schoolId,
            name: data.name,
            email: data.email,
            address: data.address,
            bloodGroup: data.bloodGroup,
            busNumber: data.busNumber,
            studentCount: data.studentCount,
        }
    })
    return NextResponse.json(driver)
}

export async function createLabAssistant(schoolId, data) {
    const lab = await prisma.labAssistant.create({
        data: {
            schoolId,
            name: data.name,
            email: data.email,
            address: data.address,
            bloodGroup: data.bloodGroup,
            labName: data.labName,
        }
    })
    return NextResponse.json(lab)
}
