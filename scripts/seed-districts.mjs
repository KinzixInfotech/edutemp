// Standalone script to seed GlobalState & GlobalDistrict from LGD JSON
// Run: node scripts/seed-districts.mjs

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    const client = await pool.connect();
    console.log('✅ DB connected');

    console.log('📂 Reading district JSON...');
    const filePath = join(root, 'src/app/atlas/tableConvert.com_qp1zps.json');
    const raw = readFileSync(filePath, 'utf-8');
    const districts = JSON.parse(raw);
    console.log(`   Found ${districts.length} district records`);

    // 1. Extract unique states
    const stateMap = new Map();
    for (const d of districts) {
        const code = d['State Code']?.trim();
        const rawName = d['State Name']?.trim();
        if (!code || !rawName) continue;
        const name = rawName.replace(/\s*\(.*?\)\s*$/, '').trim();
        if (!stateMap.has(code)) stateMap.set(code, name);
    }

    // 2. Upsert states
    console.log(`\n🏛  Upserting ${stateMap.size} states...`);
    let statesCount = 0;
    for (const [stateCode, name] of stateMap) {
        await client.query(
            `INSERT INTO "GlobalState" (id, "stateCode", name, "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW())
             ON CONFLICT ("stateCode") DO UPDATE SET name = $2, "updatedAt" = NOW()`,
            [stateCode, name]
        );
        statesCount++;
    }
    console.log(`   ✅ ${statesCount} states upserted`);

    // 3. Upsert districts
    console.log(`\n🗺  Upserting districts...`);
    let created = 0, skipped = 0;

    for (const d of districts) {
        const lgdCode = d['District LGD Code']?.trim();
        const name = d['District Name (In English)']?.trim();
        const stateCode = d['State Code']?.trim();
        const shortName = d['Short Name of District']?.trim() || null;
        const censusCode = d['Census2011 Code']?.trim() || null;

        if (!lgdCode || !name || !stateCode || !stateMap.has(stateCode)) {
            skipped++;
            continue;
        }

        await client.query(
            `INSERT INTO "GlobalDistrict" (id, "lgdCode", name, "stateCode", "shortName", "censusCode", "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW())
             ON CONFLICT ("lgdCode") DO UPDATE SET
               name = $2, "stateCode" = $3, "shortName" = $4, "censusCode" = $5, "updatedAt" = NOW()`,
            [lgdCode, name, stateCode, shortName, censusCode]
        );
        created++;
        if (created % 100 === 0) console.log(`   ${created}/${districts.length}...`);
    }

    console.log(`\n   ✅ ${created} districts upserted, ${skipped} skipped`);

    // 4. Verify
    const stateResult = await client.query('SELECT COUNT(*) FROM "GlobalState"');
    const districtResult = await client.query('SELECT COUNT(*) FROM "GlobalDistrict"');
    console.log(`\n📊 Final DB counts: ${stateResult.rows[0].count} states, ${districtResult.rows[0].count} districts`);

    // Show sample
    const sample = await client.query(
        `SELECT d.name as district, s.name as state FROM "GlobalDistrict" d
         JOIN "GlobalState" s ON d."stateCode" = s."stateCode"
         ORDER BY s.name, d.name LIMIT 5`
    );
    console.log('\n📝 Sample records:');
    sample.rows.forEach(r => console.log(`   ${r.district}, ${r.state}`));

    client.release();
}

main()
    .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
    .finally(() => pool.end());
