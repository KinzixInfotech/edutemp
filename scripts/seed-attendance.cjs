// scripts/seed-attendance.js
// Seed attendance data for Bright Future School from April 2025 to today
// Usage: node scripts/seed-attendance.js

const { Pool } = require('pg');

const SCHOOL_ID = 'daa851f1-88bd-4220-9f7b-7744c4a37d4d';
const ACADEMIC_YEAR_ID = '3596a7e7-8ed4-44e2-9800-b1bc4c348785';

// ─── Indian Holidays 2025-2026 (dates to skip) ───
const HOLIDAYS = new Set([
    // 2025
    '2025-01-14', // Makar Sankranti
    '2025-01-26', // Republic Day
    '2025-03-14', // Holi
    '2025-03-15', // Holi (day after)
    '2025-03-31', // Eid-ul-Fitr (approx)
    '2025-04-01', // Eid-ul-Fitr (day 2)
    '2025-04-06', // Ram Navami
    '2025-04-10', // Mahavir Jayanti
    '2025-04-14', // Ambedkar Jayanti
    '2025-04-18', // Good Friday
    '2025-05-12', // Buddha Purnima
    '2025-06-07', // Eid-ul-Adha (approx)
    '2025-07-06', // Muharram (approx)
    '2025-08-09', // Raksha Bandhan
    '2025-08-15', // Independence Day
    '2025-08-16', // Janmashtami
    '2025-09-05', // Teacher's Day (half day usually, skip for simplicity)
    '2025-09-27', // Milad-un-Nabi (approx)
    '2025-10-01', // Navratri start
    '2025-10-02', // Gandhi Jayanti / Dussehra
    '2025-10-03', // Dussehra
    '2025-10-20', // Diwali
    '2025-10-21', // Diwali (day 2)
    '2025-10-22', // Govardhan Puja
    '2025-10-23', // Bhai Dooj
    '2025-11-01', // Chhath (approx)
    '2025-11-05', // Guru Nanak Jayanti
    '2025-12-25', // Christmas
    '2025-12-31', // New Year's Eve
    // 2026
    '2026-01-01', // New Year
    '2026-01-14', // Makar Sankranti
    '2026-01-26', // Republic Day
    '2026-03-03', // Holi (approx)
    '2026-03-04', // Holi (day after)
]);

// Summer break: May 15 - June 30
function isSummerBreak(date) {
    const m = date.getMonth(); // 0-indexed
    const d = date.getDate();
    // May 15 – June 30
    if (m === 4 && d >= 15) return true;  // May 15-31
    if (m === 5) return true;              // June 1-30
    return false;
}

// Winter break: Dec 26 - Dec 31, Jan 1 - Jan 5
function isWinterBreak(date) {
    const m = date.getMonth();
    const d = date.getDate();
    if (m === 11 && d >= 26) return true; // Dec 26-31
    if (m === 0 && d <= 5) return true;    // Jan 1-5
    return false;
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function isSunday(date) {
    return date.getDay() === 0;
}

// Second Saturday of month
function isSecondSaturday(date) {
    if (date.getDay() !== 6) return false;
    const d = date.getDate();
    return d >= 8 && d <= 14;
}

function isSchoolDay(date) {
    const dateStr = formatDate(date);
    if (isSunday(date)) return false;
    if (isSecondSaturday(date)) return false;
    if (HOLIDAYS.has(dateStr)) return false;
    if (isSummerBreak(date)) return false;
    if (isWinterBreak(date)) return false;
    return true;
}

async function main() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres.phvmfjcpvkkfhelehhdq:kinzix%40123K@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();

    try {
        console.log('🏫 Seeding attendance for Bright Future School...\n');

        // 1. Get all students
        const studentsRes = await client.query(
            'SELECT "userId", name, "classId", "sectionId", "rollNumber" FROM "Student" WHERE "schoolId" = $1',
            [SCHOOL_ID]
        );
        const students = studentsRes.rows;
        console.log(`📚 Found ${students.length} students`);

        // 2. Backdate admission dates
        console.log('\n📅 Backdating admission dates...');
        for (const student of students) {
            // Random date between 2024-08-01 and 2025-03-15
            const startTs = new Date('2024-08-01').getTime();
            const endTs = new Date('2025-03-15').getTime();
            const randomTs = startTs + Math.random() * (endTs - startTs);
            const admDate = formatDate(new Date(randomTs));

            await client.query(
                'UPDATE "Student" SET "admissionDate" = $1 WHERE "userId" = $2',
                [admDate, student.userId]
            );
        }
        console.log('✅ All admission dates backdated');

        // 3. Delete existing attendance records for this school
        console.log('\n🗑️  Deleting existing attendance records...');
        const delRes = await client.query(
            'DELETE FROM "Attendance" WHERE "schoolId" = $1',
            [SCHOOL_ID]
        );
        console.log(`✅ Deleted ${delRes.rowCount} existing records`);

        // 4. Also clear AttendanceStats
        console.log('🗑️  Clearing AttendanceStats...');
        const delStats = await client.query(
            'DELETE FROM "AttendanceStats" WHERE "schoolId" = $1',
            [SCHOOL_ID]
        );
        console.log(`✅ Deleted ${delStats.rowCount} stats records`);

        // 5. Generate school days from April 1, 2025 to today
        const startDate = new Date('2025-04-01');
        const today = new Date();
        // Set to IST today
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(today.getTime() + istOffset);
        const endDate = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());

        const schoolDays = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            if (isSchoolDay(current)) {
                schoolDays.push(formatDate(current));
            }
            current.setDate(current.getDate() + 1);
        }
        console.log(`\n📆 Generated ${schoolDays.length} school days (Apr 2025 → today)`);

        // 6. Insert attendance records in batches
        console.log('\n📝 Inserting attendance records...');
        const BATCH_SIZE = 500;
        let totalInserted = 0;

        // Generate all values first
        const allValues = [];
        for (const student of students) {
            for (const dayStr of schoolDays) {
                // ~80% present, ~15% absent, ~3% late, ~2% half day
                const rand = Math.random();
                let status;
                if (rand < 0.78) status = 'PRESENT';
                else if (rand < 0.93) status = 'ABSENT';
                else if (rand < 0.97) status = 'LATE';
                else status = 'HALF_DAY';

                // Generate check-in time for present/late
                let checkInTime = null;
                if (status === 'PRESENT' || status === 'LATE' || status === 'HALF_DAY') {
                    const hour = status === 'LATE' ? 9 + Math.floor(Math.random() * 2) : 7 + Math.floor(Math.random() * 2);
                    const minute = Math.floor(Math.random() * 60);
                    checkInTime = `${dayStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
                }

                allValues.push({
                    userId: student.userId,
                    schoolId: SCHOOL_ID,
                    date: dayStr,
                    status,
                    checkInTime,
                    isLateCheckIn: status === 'LATE',
                    lateByMinutes: status === 'LATE' ? 10 + Math.floor(Math.random() * 50) : null,
                });
            }
        }

        console.log(`📊 Total records to insert: ${allValues.length}`);

        // Batch insert using parameterized queries
        for (let i = 0; i < allValues.length; i += BATCH_SIZE) {
            const batch = allValues.slice(i, i + BATCH_SIZE);

            const placeholders = [];
            const params = [];
            let paramIdx = 1;

            for (const v of batch) {
                placeholders.push(
                    `(gen_random_uuid(), $${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}::date, $${paramIdx + 3}::"AttendanceStatus", $${paramIdx + 4}::timestamp, $${paramIdx + 5}, $${paramIdx + 6}, NOW())`
                );
                params.push(
                    v.userId,
                    v.schoolId,
                    v.date,
                    v.status,
                    v.checkInTime,
                    v.isLateCheckIn,
                    v.lateByMinutes
                );
                paramIdx += 7;
            }

            const query = `
                INSERT INTO "Attendance" (id, "userId", "schoolId", date, status, "checkInTime", "isLateCheckIn", "lateByMinutes", "markedAt")
                VALUES ${placeholders.join(',\n')}
                ON CONFLICT ("userId", "schoolId", date) DO NOTHING
            `;

            await client.query(query, params);
            totalInserted += batch.length;

            if (totalInserted % 5000 === 0 || totalInserted === allValues.length) {
                const pct = ((totalInserted / allValues.length) * 100).toFixed(1);
                process.stdout.write(`\r  Progress: ${totalInserted}/${allValues.length} (${pct}%)`);
            }
        }

        console.log(`\n\n✅ Inserted ${totalInserted} attendance records!`);

        // 7. Verify
        const verifyRes = await client.query(
            'SELECT COUNT(*) as cnt FROM "Attendance" WHERE "schoolId" = $1',
            [SCHOOL_ID]
        );
        console.log(`\n📊 Verification: ${verifyRes.rows[0].cnt} total records in database`);

        // Show per-status breakdown
        const breakdown = await client.query(
            'SELECT status, COUNT(*) as cnt FROM "Attendance" WHERE "schoolId" = $1 GROUP BY status ORDER BY cnt DESC',
            [SCHOOL_ID]
        );
        console.log('\n📈 Status Breakdown:');
        for (const row of breakdown.rows) {
            console.log(`   ${row.status}: ${row.cnt}`);
        }

        console.log('\n🎉 Attendance seeding complete!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
