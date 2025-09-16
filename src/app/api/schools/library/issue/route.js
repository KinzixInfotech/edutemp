// app/api/library/issue/route.js
import prisma from "@/lib/prisma";
// import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Uncomment when using authentication

export async function POST(req) {
    try {
        // const session = await getServerSession(authOptions);
        // if (!session) {
        //     return Response.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        const body = await req.json();
        const { bookId, issuedToId, issuedAt, dueAt, role, fineAmount} = body;

        if (!bookId) {
            return Response.json({ error: 'Missing bookId' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: issuedToId } });
        if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        let targetUserId = issuedToId;

        if (role === 'ADMIN') {
            if (!issuedToId) {
                return Response.json({ error: 'Missing issuedToId for admin' }, { status: 400 });
            }
            const targetUser = await prisma.user.findUnique({
                where: { id: issuedToId },
                include: {
                    role: {
                        select: { name: true }
                    }
                }
            });

            if (!targetUser || (targetUser.role.name !== 'STUDENT' && targetUser.role.name !== 'TeachingStaff')) {
                return Response.json({ error: 'Target user not eligible' }, { status: 400 });
            }
        } else if (role === 'STUDENT' || role === 'TeachingStaff') {
            // Uncomment below when using session
            // targetUserId = session.user.id;
            targetUserId = issuedToId; // For now, fallback to issuedToId for testing
        } else {
            return Response.json({ error: 'Not allowed to issue books' }, { status: 403 });
        }

        const book = await prisma.libraryBook.findUnique({ where: { id: bookId } });
        if (!book || book.status !== 'available') {
            return Response.json({ error: 'Book not available' }, { status: 400 });
        }

        // ✅ Check if the book is already issued to this user
        if (book.issuedToId === targetUserId && book.status === 'issued') {
            return Response.json({ error: 'Book already issued to this user' }, { status: 400 });
        }

        const updatedBook = await prisma.libraryBook.update({
            where: { id: bookId },
            data: {
                status: 'issued',
                fineAmount:fineAmount,
                issuedToId: targetUserId,
                issuedAt: new Date(issuedAt || Date.now()),
                dueAt: new Date(dueAt || Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        return Response.json({ success: true, book: updatedBook }, { status: 200 });
    } catch (error) {
        console.error(error);
        return Response.json({ error: 'Server error' }, { status: 500 });
    }
}
