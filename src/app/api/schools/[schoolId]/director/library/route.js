import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        if (!schoolId || schoolId === 'null') {
            return NextResponse.json({ error: 'Invalid schoolId' }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';

        const cacheKey = generateKey('director:library', { schoolId, search });

        const data = await remember(cacheKey, async () => {
            const searchWhere = search ? {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { author: { contains: search, mode: 'insensitive' } },
                    { isbn: { contains: search, mode: 'insensitive' } }
                ]
            } : {};

            const [
                totalBooks,
                issuedBooks,
                overdueBooks,
                pendingRequests,
                books,
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
                // Get book catalog
                prisma.libraryBook.findMany({
                    where: {
                        schoolId,
                        ...searchWhere
                    },
                    include: {
                        category: { select: { name: true } },
                        _count: { select: { copies: true } }
                    },
                    orderBy: { title: 'asc' },
                    take: 50
                }).catch(() => []),
                // Get recent transactions
                prisma.libraryTransaction.findMany({
                    where: { schoolId },
                    include: {
                        copy: {
                            select: {
                                book: {
                                    select: {
                                        title: true,
                                        author: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { issueDate: 'desc' },
                    take: 10
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
                books: books.map(b => ({
                    id: b.id,
                    title: b.title,
                    author: b.author,
                    isbn: b.isbn,
                    category: b.category?.name || 'Uncategorized',
                    copies: b._count?.copies || 0,
                    publishedYear: b.publishedYear,
                    publisher: b.publisher
                })),
                recentTransactions: recentTransactions.map(t => ({
                    id: t.id,
                    bookTitle: t.copy?.book?.title || 'Unknown',
                    author: t.copy?.book?.author || '',
                    userId: t.userId,
                    userType: t.userType,
                    issueDate: t.issueDate?.toISOString(),
                    dueDate: t.dueDate?.toISOString(),
                    returnDate: t.returnDate?.toISOString(),
                    status: t.status,
                    isOverdue: t.dueDate < new Date() && !t.returnDate
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