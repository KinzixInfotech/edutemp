import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { invalidatePattern } from '@/lib/cache';

// POST - Freeze/Unfreeze a school wallet
export async function POST(req) {
    try {
        const body = await req.json();
        const { schoolId, freeze, role } = body;

        // Check SUPER_ADMIN role
        if (role !== 'SUPER_ADMIN') {
            return NextResponse.json(
                { error: 'Only SUPER_ADMIN can freeze/unfreeze wallets' },
                { status: 403 }
            );
        }

        if (!schoolId) {
            return NextResponse.json(
                { error: 'School ID is required' },
                { status: 400 }
            );
        }

        // Find wallet
        const wallet = await prisma.smsWallet.findUnique({
            where: { schoolId },
        });

        if (!wallet) {
            return NextResponse.json(
                { error: 'Wallet not found' },
                { status: 404 }
            );
        }

        // Update freeze status
        await prisma.smsWallet.update({
            where: { id: wallet.id },
            data: {
                isFrozen: freeze,
            },
        });

        // Create transaction log
        await prisma.smsWalletTransaction.create({
            data: {
                walletId: wallet.id,
                type: freeze ? 'FREEZE' : 'UNFREEZE',
                amount: 0,
                description: `[Admin] Wallet ${freeze ? 'frozen' : 'unfrozen'}`,
            },
        });

        // Invalidate cache
        await invalidatePattern(`sms:wallet:*`);

        return NextResponse.json({
            success: true,
            message: freeze ? 'Wallet frozen' : 'Wallet unfrozen'
        });
    } catch (error) {
        console.error('[SMS WALLET FREEZE ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to update wallet', details: error.message },
            { status: 500 }
        );
    }
}
