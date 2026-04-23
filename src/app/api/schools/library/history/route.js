import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Fetch book issue/reservation history for a specific user
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const bookId = searchParams.get("bookId");

        if (!bookId) {
            return NextResponse.json({ error: "Missing Book Id" }, { status: 400 });
        }

        // const session = await getServerSession(authOptions);
        // if (!session) {
        //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        // }

        const history = await prisma.libraryBook.findMany({
            where: {
                OR: [
                    { id: bookId },
                    // { reservedById: userId }
                ]
            },
            include: {
                issuedTo: true,
                reservedBy: true
            }
        });

        return NextResponse.json({ success: true, history }, { status: 200 });
    } catch (error) {
        console.error("Error fetching history:", error);
        return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }
}

