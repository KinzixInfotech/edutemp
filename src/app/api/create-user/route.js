// import { PrismaClient } from '@prisma/client';

import prisma from "@/lib/prisma";

// const prisma = new PrismaClient();

export async function POST(req) {
    try {
        const body = await req.json();
        const { email, name, role, schoolId } = body;

        if (!email || !role || !schoolId) {
            return Response.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Check if user already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return Response.json({ message: 'User already exists' }, { status: 200 });
        }

        // Create new user
        const user = await prisma.user.create({
            data: { email, name, role, schoolId }
        });

        return Response.json({ success: true, user }, { status: 201 });

    } catch (error) {
        console.error(error);
        return Response.json({ error: 'Server error' }, { status: 500 });
    }
}
