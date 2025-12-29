import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey, invalidatePattern } from '@/lib/cache';

// GET - Get wallet balance and recent transactions
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        if (!schoolId || schoolId === 'null') {
            return NextResponse.json({ error: 'Invalid schoolId' }, { status: 400 });
        }

        const cacheKey = generateKey('sms:wallet', { schoolId });

        const data = await remember(cacheKey, async () => {
            // Get or create wallet
            let wallet = await prisma.smsWallet.findUnique({
                where: { schoolId },
                include: {
                    transactions: {
                        orderBy: { createdAt: 'desc' },
                        take: 20
                    }
                }
            });

            if (!wallet) {
                wallet = await prisma.smsWallet.create({
                    data: { schoolId },
                    include: {
                        transactions: {
                            orderBy: { createdAt: 'desc' },
                            take: 20
                        }
                    }
                });
            }

            return {
                id: wallet.id,
                balance: wallet.balance,
                totalCredits: wallet.totalCredits,
                usedCredits: wallet.usedCredits,
                transactions: wallet.transactions.map(t => ({
                    id: t.id,
                    type: t.type,
                    amount: t.amount,
                    description: t.description,
                    referenceId: t.referenceId,
                    createdAt: t.createdAt
                }))
            };
        }, 60); // Cache for 1 minute

        return NextResponse.json(data);
    } catch (error) {
        console.error('[SMS WALLET GET ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch wallet', details: error.message },
            { status: 500 }
        );
    }
}

// POST - Recharge wallet (manual)
export async function POST(req, { params }) {
    try {
        const { schoolId } = await params;
        const body = await req.json();
        const { amount, referenceId, description } = body;

        if (!schoolId || schoolId === 'null') {
            return NextResponse.json({ error: 'Invalid schoolId' }, { status: 400 });
        }

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // Get or create wallet
        let wallet = await prisma.smsWallet.findUnique({
            where: { schoolId }
        });

        if (!wallet) {
            wallet = await prisma.smsWallet.create({
                data: { schoolId }
            });
        }

        // Update wallet and create transaction
        const [updatedWallet, transaction] = await prisma.$transaction([
            prisma.smsWallet.update({
                where: { id: wallet.id },
                data: {
                    balance: { increment: amount },
                    totalCredits: { increment: amount }
                }
            }),
            prisma.smsWalletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'RECHARGE',
                    amount,
                    description: description || `Recharge of ${amount} credits`,
                    referenceId
                }
            })
        ]);

        // Invalidate cache
        await invalidatePattern(`sms:wallet:*`);

        return NextResponse.json({
            balance: updatedWallet.balance,
            transaction
        });
    } catch (error) {
        console.error('[SMS WALLET POST ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to recharge wallet', details: error.message },
            { status: 500 }
        );
    }
}
