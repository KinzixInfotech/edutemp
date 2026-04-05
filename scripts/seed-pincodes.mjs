// Standalone Node.js script to seed a list of test pincodes into the DB
// and initialize them in the ImportProgress table queue.
// Usage: node scripts/seed-pincodes.mjs

import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '../src/app/generated/prisma/client.js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

// In a real scenario, this would be a JSON file of all 19,000+ Indian pincodes mapped to LGD districts
// We are hardcoding a small array here containing valid Delhi pincodes for verification.
const TEST_PINCODES = [
    { pincode: '110001', districtCode: '85', stateCode: '7' }, // New Delhi (District 85, State 7 in LGD)
    { pincode: '110002', districtCode: '85', stateCode: '7' }, 
    { pincode: '110003', districtCode: '85', stateCode: '7' }, 
    { pincode: '110020', districtCode: '89', stateCode: '7' }, // South Delhi
];

async function seedPincodes() {
    console.log('🌱 Seeding Test Pincodes for UDISE Ingestion Pipeline...');
    try {
        for (const data of TEST_PINCODES) {
            
            // Check if district and state exist in the DB
            const district = await prisma.globalDistrict.findUnique({
                where: { lgdCode: data.districtCode }
            });
            const state = await prisma.globalState.findUnique({
                where: { stateCode: data.stateCode }
            });

            if (!state) {
                console.warn(`[WARN] State ${data.stateCode} not found for Pincode ${data.pincode}. Ensure you ran seed-districts.mjs first. Skipping.`);
                continue;
            }

            if (!district) {
                console.warn(`[WARN] District ${data.districtCode} not found for Pincode ${data.pincode}. Skiping.`);
                continue;
            }

            console.log(`Inserting Pincode: ${data.pincode}`);
            
            // 1. Upsert GlobalPincode
            await prisma.globalPincode.upsert({
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

            // 2. Queue in ImportProgress Queue table
            await prisma.importProgress.upsert({
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
        }
        
        console.log('✅ Seeding completed! Hit GET /api/cron/atlas-import to test the ingestion pipeline.');
    } catch (e) {
        console.error('❌ Seeding failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

seedPincodes();
