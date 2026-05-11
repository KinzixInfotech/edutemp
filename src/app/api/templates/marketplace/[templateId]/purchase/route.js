import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccess } from '@/lib/api-auth';
import { ensureTemplateMarketplaceTables, getRazorpayClient, verifyRazorpaySignature } from '@/lib/template-marketplace';

export async function POST(request, props) {
    const auth = await verifyAdminAccess(request);
    if (auth.error) return auth.response;
    const { templateId } = await props.params;
    const schoolId = auth.user?.schoolId;
    if (!schoolId) return NextResponse.json({ error: 'School context is required' }, { status: 400 });
    const body = await request.json();

    await ensureTemplateMarketplaceTables();
    const [template] = await prisma.$queryRaw`
        SELECT "id", "name", "pricing", "pricePaise"
        FROM "MarketplaceTemplate"
        WHERE "id" = ${templateId}::uuid AND "status" = 'published'
        LIMIT 1
    `;
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    if (template.pricing !== 'premium' || Number(template.pricePaise) <= 0) {
        await prisma.$executeRaw`
            INSERT INTO "PurchasedTemplate" ("schoolId", "marketplaceTemplateId", "status", "purchasedById")
            VALUES (${schoolId}::uuid, ${templateId}::uuid, 'unlocked', ${auth.user.id}::uuid)
            ON CONFLICT ("schoolId", "marketplaceTemplateId") DO UPDATE SET "status" = 'unlocked', "updatedAt" = CURRENT_TIMESTAMP
        `;
        return NextResponse.json({ unlocked: true });
    }

    if (body.razorpayOrderId && body.razorpayPaymentId && body.razorpaySignature) {
        const verified = verifyRazorpaySignature({
            orderId: body.razorpayOrderId,
            paymentId: body.razorpayPaymentId,
            signature: body.razorpaySignature,
        });
        if (!verified) return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });

        await prisma.$executeRaw`
            INSERT INTO "PurchasedTemplate" (
                "schoolId", "marketplaceTemplateId", "amountPaise", "currency",
                "razorpayOrderId", "razorpayPaymentId", "status", "purchasedById"
            )
            VALUES (
                ${schoolId}::uuid, ${templateId}::uuid, ${Number(template.pricePaise)}, 'INR',
                ${body.razorpayOrderId}, ${body.razorpayPaymentId}, 'unlocked', ${auth.user.id}::uuid
            )
            ON CONFLICT ("schoolId", "marketplaceTemplateId") DO UPDATE SET
                "razorpayOrderId" = EXCLUDED."razorpayOrderId",
                "razorpayPaymentId" = EXCLUDED."razorpayPaymentId",
                "status" = 'unlocked',
                "updatedAt" = CURRENT_TIMESTAMP
        `;
        return NextResponse.json({ unlocked: true });
    }

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
        amount: Number(template.pricePaise),
        currency: 'INR',
        receipt: `tmpl_${templateId.slice(0, 8)}_${Date.now()}`,
        notes: { templateId, schoolId, templateName: template.name },
    });

    return NextResponse.json({
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        templateName: template.name,
    });
}
