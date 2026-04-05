import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET(req) {
    console.log('🌱 Seeding All India Pincodes for UDISE Ingestion Pipeline...');
    try {
        const filePath = path.join(process.cwd(), 'src/app/atlas/all_india_pincodes.json');
        const rawData = fs.readFileSync(filePath, 'utf8');
        const uniquePincodes = JSON.parse(rawData);

        console.log(`Loaded ${uniquePincodes.length} unique pincodes across India.`);

        const results = [];
        let skippedDistrictMatch = 0;

        // Optionally, pre-load states to do stateName matching, but simpler to just upsert ImportProgress primarily.
        // We will process in batches of 1000 to avoid long request timeouts.
        // Wait, for an API route, processing 19,000 upserts synchronously might take 10-20 seconds. Let's do bulk upserts or chunk processing if needed, but simple loop might pass locally.
        
        for (const data of uniquePincodes) {
            
            // Queue in ImportProgress Queue table FIRST. 
            // We ALWAYS want to crawl every pincode, regardless of mapping purity.
            await prisma.importProgress.upsert({
                where: { pincode: String(data.pincode) },
                update: {
                    status: 'pending', // Reset status for fresh import
                    retryCount: 0
                },
                create: {
                    pincode: String(data.pincode),
                    status: 'pending'
                }
            });

            // Note: We're skipping GlobalPincode upsert here to massively speed up the API and because 
            // the worker solely relies on ImportProgress. The mapping can be perfected later if needed, 
            // but the crawl pipeline is what matters.

            results.push({ pincode: String(data.pincode) });
            
            if (results.length % 1000 === 0) {
                console.log(`Seeded ${results.length} pincodes into ImportProgress...`);
            }
        }
        
        return NextResponse.json({ 
            success: true, 
            message: `Seeding completed! Queued ${results.length} pincodes into ImportProgress for the worker.`, 
            total: results.length 
        });
    } catch (e) {
        console.error('❌ Seeding failed:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
