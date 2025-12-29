import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { invalidatePattern } from '@/lib/cache';

// POST - Request/Add credits (For now acting as direct recharge per user request)
export async function POST(req, { params }) {
    try {
        const { schoolId } = await params;
        const body = await req.json();
        const { credits, amount, referenceId, notes } = body;

        if (!schoolId) {
            return NextResponse.json({ error: 'Invalid schoolId' }, { status: 400 });
        }

        // Just use credits as the amount to add
        const creditsToAdd = parseInt(credits);

        if (!creditsToAdd || creditsToAdd <= 0) {
            return NextResponse.json({ error: 'Invalid credits amount' }, { status: 400 });
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
        // "For now just add the requested credit"
        const [updatedWallet, transaction] = await prisma.$transaction([
            prisma.smsWallet.update({
                where: { id: wallet.id },
                data: {
                    balance: { increment: creditsToAdd },
                    totalCredits: { increment: creditsToAdd }
                }
            }),
            prisma.smsWalletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'RECHARGE',
                    amount: creditsToAdd,
                    description: `Recharge Request: ${creditsToAdd} credits (Auto-approved) - ${notes || ''}`,
                    referenceId: referenceId
                }
            })
        ]);

        // Invalidate cache
        await invalidatePattern(`sms:wallet:*`);

        return NextResponse.json({
            success: true,
            balance: updatedWallet.balance,
            transaction
        });

    } catch (error) {
        console.error('[SMS WALLET REQUEST ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to process request', details: error.message },
            { status: 500 }
        );
    }
}
