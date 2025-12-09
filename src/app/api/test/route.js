import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const data = await prisma.school.findMany();
        return Response.json({
            success: true,
            count: data.length,
            data
        });
    } catch (error) {
        console.error("Test API Error:", error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
