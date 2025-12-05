import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get count of unseen pending requests
export async function GET(req, props) {
  const params = await props.params;
    try {
        const { schoolId } = params;

        const unseenCount = await prisma.libraryBookRequest.count({
            where: {
                schoolId,
                status: "PENDING",
            },
        });

        return NextResponse.json({ count: unseenCount });
    } catch (error) {
        console.error("Error fetching unseen requests count:", error);
        return NextResponse.json(
            { error: "Failed to fetch count" },
            { status: 500 }
        );
    }
}
