import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { invalidatePattern } from '@/lib/cache';

// GET - List all school wallets
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';

        const wallets = await prisma.smsWallet.findMany({
            include: {
                school: {
                    select: {
                        id: true,
                        name: true,
                        schoolCode: true,
                    },
                },
            },
            orderBy: { balance: 'desc' },
        });

        const formatted = wallets
            .filter(w =>
                !search ||
                w.school?.name?.toLowerCase().includes(search.toLowerCase()) ||
                w.school?.schoolCode?.toLowerCase().includes(search.toLowerCase())
            )
            .map(w => ({
                id: w.id,
                schoolId: w.schoolId,
                schoolName: w.school?.name || 'Unknown',
                schoolCode: w.school?.schoolCode || '-',
                balance: w.balance,
                totalCredits: w.totalCredits,
                usedCredits: w.usedCredits,
                isFrozen: w.isFrozen || false,
            }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('[SMS WALLETS GET ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch wallets', details: error.message },
            { status: 500 }
        );
    }
}

// POST - Add/deduct credits for a school
export async function POST(req) {
    try {
        const body = await req.json();
        const { schoolId, amount, reason, role } = body;

        // Check SUPER_ADMIN role
        if (role !== 'SUPER_ADMIN') {
            return NextResponse.json(
                { error: 'Only SUPER_ADMIN can adjust credits' },
                { status: 403 }
            );
        }

        if (!schoolId) {
            return NextResponse.json(
                { error: 'School ID is required' },
                { status: 400 }
            );
        }

        if (!amount || amount === 0) {
            return NextResponse.json(
                { error: 'Amount is required and cannot be zero' },
                { status: 400 }
            );
        }

        if (!reason) {
            return NextResponse.json(
                { error: 'Reason is required' },
                { status: 400 }
            );
        }

        // Find or create wallet
        let wallet = await prisma.smsWallet.findUnique({
            where: { schoolId },
        });

        if (!wallet) {
            wallet = await prisma.smsWallet.create({
                data: {
                    schoolId,
                    balance: 0,
                    totalCredits: 0,
                    usedCredits: 0,
                },
            });
        }

        // Check if wallet is frozen
        if (wallet.isFrozen) {
            return NextResponse.json(
                { error: 'Wallet is frozen. Unfreeze it first.' },
                { status: 400 }
            );
        }

        // Check for sufficient balance if deducting
        if (amount < 0 && wallet.balance + amount < 0) {
            return NextResponse.json(
                { error: 'Insufficient balance for deduction' },
                { status: 400 }
            );
        }

        // Update wallet and create transaction
        const isAddition = amount > 0;

        await prisma.$transaction([
            prisma.smsWallet.update({
                where: { id: wallet.id },
                data: {
                    balance: { increment: amount },
                    ...(isAddition && { totalCredits: { increment: amount } }),
                },
            }),
            prisma.smsWalletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: isAddition ? 'ADMIN_ADD' : 'ADMIN_DEDUCT',
                    amount: amount,
                    description: `[Admin] ${reason}`,
                },
            }),
        ]);

        // Invalidate cache
        await invalidatePattern(`sms:wallet:*`);

        return NextResponse.json({
            success: true,
            message: `${isAddition ? 'Added' : 'Deducted'} ${Math.abs(amount)} credits`
        });
    } catch (error) {
        console.error('[SMS WALLETS POST ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to adjust credits', details: error.message },
            { status: 500 }
        );
    }
}
