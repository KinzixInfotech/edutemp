// For admin to get eligible users (Students and TeachingStaff)

import prisma from "@/lib/prisma";
// import { getServerSession } from "next-auth/next";

export async function GET(req) {
    try {
        // const session = await getServerSession(authOptions);
        // if (!session || session.user.role !== 'Admin') {
        //     return Response.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        const users = await prisma.user.findMany({
            where: {
                role: {
                    name: {
                        in: ['STUDENT', 'TEACHERS'],
                    },

                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
                role: {
                    select: {
                        name: true
                    }
                },
            },
        });


        return Response.json({ success: true, users }, { status: 200 });
    } catch (error) {
        console.error(error);
        return Response.json({ error: 'Server error' }, { status: 500 });
    }
}