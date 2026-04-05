// Standalone Node.js script to seed a list of test pincodes into the DB
// and initialize them in the ImportProgress table queue.
// Usage: node scripts/seed-pincodes.mjs

import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import pg from 'pg';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function seedPincodes() {
    console.log('🌱 Seeding All India Pincodes for UDISE Ingestion Pipeline...');
    
    // Connect to DB via PG
    const client = await pool.connect();
    console.log('✅ DB connected');

    try {
        const filePath = path.join(__dirname, '../src/app/atlas/all_india_pincodes.json');
        const rawData = fs.readFileSync(filePath, 'utf8');
        const uniquePincodes = JSON.parse(rawData);

        console.log(`Loaded ${uniquePincodes.length} unique pincodes across India.`);
        console.log(`Inserting ${uniquePincodes.length} pincodes into ImportProgress queue...`);

        // Chunking the inserts to avoid postgres max params limit (65535)
        const chunkSize = 5000;
        let insertedRows = 0;

        for (let i = 0; i < uniquePincodes.length; i += chunkSize) {
            const chunk = uniquePincodes.slice(i, i + chunkSize);
            let chunkValues = [];
            let chunkParams = [];
            let cIndex = 1;

            for (const p of chunk) {
                const pin = String(p.pincode);
                chunkValues.push(`($${cIndex++}, $${cIndex++}, $${cIndex++}, $${cIndex++}, NOW())`);
                const fakeCuid = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2) + i + cIndex;
                chunkParams.push(fakeCuid, pin, 'pending', null);
            }

            const query = `
                INSERT INTO "ImportProgress" ("id", "pincode", "status", "lastRunAt", "updatedAt") 
                VALUES ${chunkValues.join(', ')}
                ON CONFLICT ("pincode") DO UPDATE SET "status" = 'pending', "updatedAt" = NOW()
            `;
            await client.query(query, chunkParams);
            insertedRows += chunk.length;
            console.log(` - Chunk inserted... (${insertedRows}/${uniquePincodes.length})`);
        }

        console.log(`✅ Seeding completed! Inserted ${insertedRows} new pincodes into the queue.`);
        console.log('You can now see these in Prisma Studio under the ImportProgress table and let the Cron process the entire country automatically!');

    } catch (e) {
        console.error('❌ Seeding failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

seedPincodes();

