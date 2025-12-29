import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { invalidatePattern } from '@/lib/cache';

const DEFAULT_CONFIG = {
    costPerCredit: 0.20,
    minPurchase: 100,
    packs: [
        { credits: 100, price: 20, enabled: true },
        { credits: 500, price: 100, enabled: true },
        { credits: 1000, price: 200, enabled: true },
    ],
    whitelistedDomains: ['edubreezy.com', 'www.edubreezy.com', 'school.edubreezy.com'],
};

// GET - Fetch pricing config
export async function GET(req) {
    try {
        const cacheKey = 'sms:pricing:config';

        // Try cache first
        const cached = await redis.get(cacheKey);
        if (cached) {
            // Redis returns strings, parse if needed
            const parsedCache = typeof cached === 'string' ? JSON.parse(cached) : cached;
            return NextResponse.json(parsedCache);
        }

        // Get from database - SmsSettings is now mandatory
        let dbConfig = await prisma.smsSettings.findFirst();

        // If no config exists, create one with defaults
        if (!dbConfig) {
            dbConfig = await prisma.smsSettings.create({
                data: {
                    id: 'default',
                    costPerSms: DEFAULT_CONFIG.costPerCredit,
                    minPurchase: DEFAULT_CONFIG.minPurchase,
                    creditPacks: DEFAULT_CONFIG.packs,
                    whitelistedDomains: DEFAULT_CONFIG.whitelistedDomains,
                },
            });
        }

        const config = {
            costPerCredit: dbConfig.costPerSms,
            minPurchase: dbConfig.minPurchase,
            packs: dbConfig.creditPacks,
            whitelistedDomains: dbConfig.whitelistedDomains,
        };

        // Cache for 5 minutes
        await redis.set(cacheKey, JSON.stringify(config), { ex: 300 });

        return NextResponse.json(config);
    } catch (error) {
        console.error('[SMS PRICING GET ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch pricing config', details: error.message },
            { status: 500 }
        );
    }
}

// PUT - Update pricing config (SUPER_ADMIN only)
export async function PUT(req) {
    try {
        const body = await req.json();
        const { costPerCredit, minPurchase, packs, whitelistedDomains, role } = body;

        // Check SUPER_ADMIN role
        if (role !== 'SUPER_ADMIN') {
            return NextResponse.json(
                { error: 'Only SUPER_ADMIN can update pricing' },
                { status: 403 }
            );
        }

        // Validate
        if (costPerCredit <= 0) {
            return NextResponse.json(
                { error: 'Cost per credit must be positive' },
                { status: 400 }
            );
        }

        if (minPurchase < 1) {
            return NextResponse.json(
                { error: 'Minimum purchase must be at least 1' },
                { status: 400 }
            );
        }

        const config = {
            costPerCredit: parseFloat(costPerCredit) || 0.20,
            minPurchase: parseInt(minPurchase) || 100,
            packs: packs || DEFAULT_CONFIG.packs,
            whitelistedDomains: whitelistedDomains || DEFAULT_CONFIG.whitelistedDomains,
        };

        // Save to database - mandatory
        await prisma.smsSettings.upsert({
            where: { id: 'default' },
            update: {
                costPerSms: config.costPerCredit,
                minPurchase: config.minPurchase,
                creditPacks: config.packs,
                whitelistedDomains: config.whitelistedDomains,
            },
            create: {
                id: 'default',
                costPerSms: config.costPerCredit,
                minPurchase: config.minPurchase,
                creditPacks: config.packs,
                whitelistedDomains: config.whitelistedDomains,
            },
        });

        // Update cache
        const cacheKey = 'sms:pricing:config';
        await redis.set(cacheKey, JSON.stringify(config), { ex: 300 });

        return NextResponse.json({ success: true, config });
    } catch (error) {
        console.error('[SMS PRICING PUT ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to update pricing', details: error.message },
            { status: 500 }
        );
    }
}
