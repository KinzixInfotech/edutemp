import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Fetch fee settings for a school
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('schoolId');

        if (!schoolId) {
            return NextResponse.json(
                { error: 'School ID is required' },
                { status: 400 }
            );
        }

        // Get or create fee settings
        let settings = await prisma.feeSettings.findUnique({
            where: { schoolId },
        });

        // If no settings exist, create default settings
        if (!settings) {
            settings = await prisma.feeSettings.create({
                data: { schoolId },
            });
        }

        return NextResponse.json({ settings });

    } catch (error) {
        console.error('[FEE SETTINGS GET ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch fee settings' },
            { status: 500 }
        );
    }
}

// POST - Create or update fee settings
export async function POST(req) {
    try {
        const body = await req.json();
        const { schoolId, type, settings: settingsData } = body;

        if (!schoolId) {
            return NextResponse.json(
                { error: 'School ID is required' },
                { status: 400 }
            );
        }

        // Build update data based on type
        let updateData = {};

        switch (type) {
            case 'general':
                updateData = {
                    currency: settingsData.currency,
                    defaultFeeMode: settingsData.defaultMode,
                    lateFeeEnabled: settingsData.lateFeeEnabled,
                    lateFeeAmount: settingsData.lateFeeAmount || 0,
                    gracePeriodDays: settingsData.lateFeeDays || 15,
                    allowPartialPayment: settingsData.allowPartialPayment ?? true,
                    allowAdvancePayment: settingsData.allowAdvancePayment ?? true,
                    installmentFlexible: settingsData.installmentFlexible ?? true,
                    autoApplyLateFee: settingsData.autoApplyLateFee ?? false,
                    lateFeeType: settingsData.lateFeeType || 'FIXED',
                    lateFeePercentage: settingsData.lateFeePercentage || 0,
                };
                break;

            case 'payment_gateway':
                updateData = {
                    onlinePaymentEnabled: settingsData.onlinePaymentEnabled ?? false,
                    paymentGateway: settingsData.paymentGateway,
                    sandboxMode: settingsData.sandboxMode ?? true,
                    razorpayKeyId: settingsData.razorpayKeyId,
                    razorpayKeySecret: settingsData.razorpayKeySecret,
                    payuMerchantKey: settingsData.payuMerchantKey,
                    payuMerchantSalt: settingsData.payuMerchantSalt,
                };
                break;

            case 'bank_details':
                updateData = {
                    showBankDetails: settingsData.showBankDetails ?? false,
                    bankName: settingsData.bankName,
                    accountNumber: settingsData.accountNumber,
                    ifscCode: settingsData.ifscCode,
                    accountHolderName: settingsData.accountHolderName,
                    branchName: settingsData.branchName,
                    upiId: settingsData.upiId,
                    bankQrCodeUrl: settingsData.bankQrCodeUrl,
                };
                break;

            case 'notifications':
                updateData = {
                    emailReminders: settingsData.emailReminders ?? true,
                    smsReminders: settingsData.smsReminders ?? false,
                    pushReminders: settingsData.pushReminders ?? false,
                    reminderDaysBefore: settingsData.reminderDays || 7,
                    overdueReminders: settingsData.overdueReminders ?? true,
                    overdueReminderInterval: settingsData.overdueReminderInterval || 7,
                };
                break;

            case 'receipts':
                updateData = {
                    receiptPrefix: settingsData.receiptPrefix || 'REC',
                    receiptTemplate: settingsData.receiptTemplate || 'default',
                    autoGenerateReceipt: settingsData.autoGenerate ?? true,
                    showSchoolLogo: settingsData.showSchoolLogo ?? true,
                    receiptFooterText: settingsData.receiptFooterText,
                };
                break;

            case 'discounts':
                updateData = {
                    siblingDiscountEnabled: settingsData.siblingDiscountEnabled ?? false,
                    siblingDiscountPercentage: settingsData.siblingDiscountPercentage || 0,
                    earlyPaymentDiscountEnabled: settingsData.earlyPaymentDiscountEnabled ?? false,
                    earlyPaymentDiscountPercentage: settingsData.earlyPaymentDiscountPercentage || 0,
                    earlyPaymentDays: settingsData.earlyPaymentDays || 10,
                    staffWardDiscountEnabled: settingsData.staffWardDiscountEnabled ?? false,
                    staffWardDiscountPercentage: settingsData.staffWardDiscountPercentage || 0,
                };
                break;

            case 'all':
                // Update all settings at once
                updateData = { ...settingsData };
                break;

            default:
                return NextResponse.json(
                    { error: 'Invalid settings type' },
                    { status: 400 }
                );
        }

        // Upsert fee settings
        const settings = await prisma.feeSettings.upsert({
            where: { schoolId },
            update: updateData,
            create: {
                schoolId,
                ...updateData,
            },
        });

        return NextResponse.json({
            message: 'Settings saved successfully',
            settings,
        });

    } catch (error) {
        console.error('[FEE SETTINGS POST ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to save fee settings' },
            { status: 500 }
        );
    }
}
