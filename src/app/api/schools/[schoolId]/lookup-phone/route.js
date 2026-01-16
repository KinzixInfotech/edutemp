// src/app/api/schools/[schoolId]/lookup-phone/route.js
// Phone to Email Lookup for Mobile App Login
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * POST /api/schools/[schoolId]/lookup-phone
 * Looks up a user's email by their phone number for login purposes
 * 
 * Searches across Parent, Student, TeachingStaff, and NonTeachingStaff tables
 */
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json();
        const { phoneNumber } = body;

        if (!phoneNumber) {
            return NextResponse.json(
                { error: "Phone number is required" },
                { status: 400 }
            );
        }

        // Clean the phone number (remove spaces, dashes, etc.)
        const cleanPhone = phoneNumber.replace(/\D/g, '');

        if (cleanPhone.length < 10) {
            return NextResponse.json(
                { error: "Invalid phone number format" },
                { status: 400 }
            );
        }

        // Take last 10 digits for matching
        const last10Digits = cleanPhone.slice(-10);

        console.log(`📱 Looking up phone: ${last10Digits} in school: ${schoolId}`);

        // Search in Parent table first (most common for mobile app login)
        const parent = await prisma.parent.findFirst({
            where: {
                schoolId,
                OR: [
                    { contactNumber: last10Digits },
                    { contactNumber: { endsWith: last10Digits } },
                ],
                status: "ACTIVE",
            },
            select: {
                email: true,
                name: true,
                user: {
                    select: {
                        email: true,
                    },
                },
            },
        });

        if (parent) {
            const email = parent.email || parent.user?.email;
            console.log(`✅ Found parent with phone ${last10Digits}: ${email}`);
            return NextResponse.json({ email, role: "PARENT" });
        }

        // Search in Student table
        const student = await prisma.student.findFirst({
            where: {
                schoolId,
                OR: [
                    { contactNumber: last10Digits },
                    { contactNumber: { endsWith: last10Digits } },
                ],
            },
            select: {
                email: true,
                name: true,
                user: {
                    select: {
                        email: true,
                        status: true,
                    },
                },
            },
        });

        if (student && student.user?.status === "ACTIVE") {
            const email = student.email || student.user?.email;
            console.log(`✅ Found student with phone ${last10Digits}: ${email}`);
            return NextResponse.json({ email, role: "STUDENT" });
        }

        // Search in TeachingStaff table
        const teacher = await prisma.teachingStaff.findFirst({
            where: {
                schoolId,
                OR: [
                    { contactNumber: last10Digits },
                    { contactNumber: { endsWith: last10Digits } },
                ],
            },
            select: {
                email: true,
                name: true,
                user: {
                    select: {
                        email: true,
                        status: true,
                    },
                },
            },
        });

        if (teacher && teacher.user?.status === "ACTIVE") {
            const email = teacher.email || teacher.user?.email;
            console.log(`✅ Found teacher with phone ${last10Digits}: ${email}`);
            return NextResponse.json({ email, role: "TEACHER" });
        }

        // Search in NonTeachingStaff table
        const staff = await prisma.nonTeachingStaff.findFirst({
            where: {
                schoolId,
                OR: [
                    { contactNumber: last10Digits },
                    { contactNumber: { endsWith: last10Digits } },
                ],
            },
            select: {
                email: true,
                name: true,
                user: {
                    select: {
                        email: true,
                        status: true,
                    },
                },
            },
        });

        if (staff && staff.user?.status === "ACTIVE") {
            const email = staff.email || staff.user?.email;
            console.log(`✅ Found staff with phone ${last10Digits}: ${email}`);
            return NextResponse.json({ email, role: "STAFF" });
        }

        // Not found
        console.log(`❌ Phone ${last10Digits} not found in school ${schoolId}`);
        return NextResponse.json(
            { error: "Phone number not registered with this school" },
            { status: 404 }
        );

    } catch (error) {
        console.error("[LOOKUP_PHONE]", error);
        return NextResponse.json(
            { error: "Failed to lookup phone number" },
            { status: 500 }
        );
    }
}
