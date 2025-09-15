
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export default async function handler(req, res) {
    // const session = await getSession({ req });
    // if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    if (req.method === "GET") {
        const { userId } = req.query;
        try {
            const history = await prisma.libraryBook.findMany({
                where: { OR: [{ issuedToId: userId }, { reservedById: userId }] },
                include: { issuedTo: true, reservedBy: true },
            });
            return NextResponse.json(history);
        } catch (error) {
            return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
        }
    }

    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}