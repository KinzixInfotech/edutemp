import prisma from '@/lib/prisma'; // Use singleton to prevent connection pool exhaustion

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');

        if (!email) {
            return Response.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { role: true },
        });

        if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        return Response.json({ role: user.role }, { status: 200 });

    } catch (err) {
        console.error(err);
        return Response.json({ error: 'Server error' }, { status: 500 });
    }
}
