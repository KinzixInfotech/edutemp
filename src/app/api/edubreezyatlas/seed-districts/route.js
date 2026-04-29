import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { readFileSync } from 'fs';
import { join } from 'path';

// POST /api/edubreezyatlas/seed-districts
// One-shot endpoint to import LGD district data into AtlasState & AtlasDistrict
export const POST = withSchoolAccess(async function POST(req) {
  try {
    // Auth check
    const internalKey = req.headers.get('x-internal-key');
    if (internalKey !== (process.env.INTERNAL_API_KEY || 'edubreezy_internal')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read the JSON data
    const filePath = join(process.cwd(), 'src/app/atlas/tableConvert.com_qp1zps.json');
    const raw = readFileSync(filePath, 'utf-8');
    const districts = JSON.parse(raw);

    // ── 1. Extract unique states ────────────────────────────────
    const stateMap = new Map();
    for (const d of districts) {
      const code = d['State Code']?.trim();
      const rawName = d['State Name']?.trim();
      if (!code || !rawName) continue;

      // Clean name: remove "(State)", "(UT)" etc.
      const name = rawName.replace(/\s*\(.*?\)\s*$/, '').trim();
      if (!stateMap.has(code)) {
        stateMap.set(code, name);
      }
    }

    // Upsert states
    let statesCreated = 0;
    for (const [stateCode, name] of stateMap) {
      await prisma.globalState.upsert({
        where: { stateCode },
        create: { stateCode, name },
        update: { name }
      });
      statesCreated++;
    }

    // ── 2. Upsert districts ─────────────────────────────────────
    let districtsCreated = 0;
    let districtsSkipped = 0;

    for (const d of districts) {
      const lgdCode = d['District LGD Code']?.trim();
      const name = d['District Name (In English)']?.trim();
      const stateCode = d['State Code']?.trim();
      const shortName = d['Short Name of District']?.trim() || null;
      const censusCode = d['Census2011 Code']?.trim() || null;

      if (!lgdCode || !name || !stateCode) {
        districtsSkipped++;
        continue;
      }

      // Verify state exists
      if (!stateMap.has(stateCode)) {
        districtsSkipped++;
        continue;
      }

      await prisma.globalDistrict.upsert({
        where: { lgdCode },
        create: {
          lgdCode,
          name,
          stateCode,
          shortName,
          censusCode
        },
        update: {
          name,
          stateCode,
          shortName,
          censusCode
        }
      });
      districtsCreated++;
    }

    return NextResponse.json({
      success: true,
      states: statesCreated,
      districts: districtsCreated,
      skipped: districtsSkipped
    });
  } catch (error) {
    console.error('[SEED DISTRICTS ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});