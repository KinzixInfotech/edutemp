import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        const cacheKey = generateKey('director:library', { schoolId });

        const data = await remember(cacheKey, async () => {
            const [
                totalBooks,
                issuedBooks,
                overdueBooks,
                pendingRequests,
                recentTransactions
            ] = await Promise.all([
                prisma.libraryBook.count({ where: { schoolId } }).catch(() => 0),
                prisma.libraryTransaction.count({
                    where: {
                        schoolId,
                        returnDate: null,
                        status: 'BORROWED'
                    }
                }).catch(() => 0),
                prisma.libraryTransaction.count({
                    where: {
                        schoolId,
                        returnDate: null,
                        status: 'BORROWED',
                        dueDate: { lt: new Date() }
                    }
                }).catch(() => 0),
                prisma.libraryBookRequest.count({
                    where: {
                        schoolId,
                        status: 'PENDING'
                    }
                }).catch(() => 0),
                prisma.libraryTransaction.findMany({
                    where: { schoolId },
                    include: {
                        book: { select: { title: true, author: true } },
                        user: { select: { name: true, role: { select: { name: true } } } }
                    },
                    orderBy: { borrowedAt: 'desc' },
                    take: 20
                }).catch(() => [])
            ]);

            return {
                summary: {
                    totalBooks,
                    issuedBooks,
                    availableBooks: totalBooks - issuedBooks,
                    overdueBooks,
                    pendingRequests
                },
                recentTransactions: recentTransactions.map(t => ({
                    id: t.id,
                    bookTitle: t.book.title,
                    author: t.book.author,
                    borrowerName: t.user.name,
                    borrowerType: t.user.role.name,
                    borrowedAt: t.borrowedAt.toISOString(),
                    dueDate: t.dueDate.toISOString(),
                    returnedAt: t.returnedAt?.toISOString(),
                    status: t.status,
                    isOverdue: t.dueDate < new Date() && !t.returnedAt
                }))
            };
        }, 120);

        return NextResponse.json(data);
    } catch (error) {
        console.error('[LIBRARY ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch library data', details: error.message },
            { status: 500 }
        );
    }
}
