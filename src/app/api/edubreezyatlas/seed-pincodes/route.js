import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Usage: GET /api/edubreezyatlas/seed-pincodes

const TEST_PINCODES = [
    { pincode: '110001', districtCode: '85', stateCode: '7' }, // New Delhi
    { pincode: '110002', districtCode: '85', stateCode: '7' }, 
    { pincode: '110003', districtCode: '85', stateCode: '7' }, 
    { pincode: '110020', districtCode: '89', stateCode: '7' }, // South Delhi
];

export async function GET(req) {
    console.log('🌱 Seeding Test Pincodes for UDISE Ingestion Pipeline...');
    try {
        const results = [];
        for (const data of TEST_PINCODES) {
            
            // Check if district and state exist in the DB
            const district = await prisma.globalDistrict.findUnique({
                where: { lgdCode: data.districtCode }
            });
            const state = await prisma.globalState.findUnique({
                where: { stateCode: data.stateCode }
            });

            if (!state) {
                console.warn(`[WARN] State ${data.stateCode} not found for Pincode ${data.pincode}. Skipping.`);
                continue;
            }

            if (!district) {
                console.warn(`[WARN] District ${data.districtCode} not found for Pincode ${data.pincode}. Skipping.`);
                continue;
            }
            
            // Upsert GlobalPincode
            const pincodeRec = await prisma.globalPincode.upsert({
                where: { pincode: data.pincode },
                update: {
                    districtCode: data.districtCode,
                    stateCode: data.stateCode,
                },
                create: {
                    pincode: data.pincode,
                    districtCode: data.districtCode,
                    stateCode: data.stateCode,
                }
            });

            // Queue in ImportProgress Queue table
            const progressRec = await prisma.importProgress.upsert({
                where: { pincode: data.pincode },
                update: {
                    status: 'pending', // Reset status for testing
                    retryCount: 0
                },
                create: {
                    pincode: data.pincode,
                    status: 'pending'
                }
            });
            results.push({ pincode: data.pincode, status: 'seeded' });
        }
        
        return NextResponse.json({ success: true, message: 'Seeding completed', results });
    } catch (e) {
        console.error('❌ Seeding failed:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
