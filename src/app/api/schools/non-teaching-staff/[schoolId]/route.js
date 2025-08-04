import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req, { params }) {
    try {
        const { schoolId } = params;

        if (!schoolId) {
            return NextResponse.json({ error: "School ID is required" }, { status: 400 });
        }

        const staff = await prisma.nonTeachingStaff.findMany({
            where: {
                schoolId,
            },
            // select: {
            //     id: true,
            //     name: true,
            //     email: true,
            //     designation: true,
            //     department: true,
            //     gender: true,
            //     contact: true,
            //     address: true,
            //     profilePicture: true,
            //     user: {
            //         select: {
            //             email: true,
            //         },
            //     },
            // },
            orderBy: {
                name: 'asc',
            },
        });

        const formatted = staff.map((s) => ({
            id: s.id,
            name: s.name,
            email: s.email || "N/A",
            subject: s.designation || "N/A",
            profilePicture: s.profilePicture || `https://i.pravatar.cc/150?u=${s.id}`,
            phone: s.contactNumber || "N/A",
            gender: s.gender || "N/A",
            status: "Active",
        }));

        return NextResponse.json({ success: true, data: formatted });
    } catch (error) {
        console.error("Error fetching non-teaching staff:", error);
        return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
    }
}
