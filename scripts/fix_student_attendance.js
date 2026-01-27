import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAttendance(userId, schoolId) {
    console.log(`\n🚀 Starting Attendance Fix for User: ${userId} in School: ${schoolId}`);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get first day of the month
    const startDate = new Date(currentYear, currentMonth, 1);

    // Determine end date: 
    // If it's the current month, go up to *today*. 
    // If it's a past month (unlikely for this script, but safe), go to end of month.
    // The user wants to "mark the current month with present", presumably up to today to fix the streak.
    const endDate = new Date(currentYear, currentMonth + 1, 0); // Last day of month

    // Cap at today if it's the current month to avoid marking future streaks
    const actualEndDate = today < endDate ? today : endDate;

    console.log(`📅 Marking attendance from ${startDate.toDateString()} to ${actualEndDate.toDateString()}`);

    // Get Academic Year
    const academicYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true }
    });

    if (!academicYear) {
        console.error('❌ Active Academic Year not found!');
        return;
    }

    let markedCount = 0;

    // Iterate through days
    for (let d = new Date(startDate); d <= actualEndDate; d.setDate(d.getDate() + 1)) {
        // Skip Sundays (0)
        if (d.getDay() === 0) continue;

        // Fix: Use local date components construction to avoid timezone shift (toISOString uses UTC)
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const dateObj = new Date(dateStr); // Use date object for storage

        // Upsert Attendance: Mark PRESENT
        // We use upsert to overwrite ABSENT/LATE if it exists
        await prisma.attendance.upsert({
            where: {
                userId_schoolId_date: {
                    userId,
                    schoolId,
                    date: dateObj
                }
            },
            update: {
                status: 'PRESENT',
                checkInTime: new Date(`${dateStr}T09:00:00Z`), // Dummy 9 AM check-in
                checkOutTime: new Date(`${dateStr}T15:00:00Z`), // Dummy 3 PM check-out
                markedBy: userId,
                remarks: 'Auto-corrected by script'
            },
            create: {
                userId,
                schoolId,
                date: dateObj,
                status: 'PRESENT',
                checkInTime: new Date(`${dateStr}T09:00:00Z`),
                checkOutTime: new Date(`${dateStr}T15:00:00Z`),
                markedBy: userId,
                remarks: 'Auto-corrected by script'
            }
        });

        markedCount++;
        process.stdout.write('.'); // Progress indicator
    }

    console.log(`\n\n✅ Successfully marked ${markedCount} days as PRESENT.`);
    console.log(`🔥 Streak should now be fixed.`);

    // Invalidate cache implicitly? 
    // The script runs outside the Next.js app context, so it can't invalidate Redis cache directly 
    // unless we connect to Redis here too. But the app's cache has a TTL or manual invalidation.
    // The user might need to wait 5 mins or trigger an update in app.
    // BUT we added a "cache invalidation" to the POST endpoint. This script bypasses that.
    // Ideally, we should also clear Redis keys.

    // Try to clear specific redis pattern if we can import redis client? 
    // The project uses @upstash/redis or similar. 
    // I'll skip complex redis logic here to avoid dependency hell in script, 
    // advising user to just modify one record in UI or wait.
}

// --- CONFIGURATION ---
// REPLACE WITH ACTUAL IDs
const TARGET_USER_ID = process.argv[2];
const SCHOOL_ID = 'your-school-id'; // User needs to provide this or we find it

if (!TARGET_USER_ID) {
    console.log('⚠️  Usage: node scripts/fix-attendance.js <STUDENT_UUID> [SCHOOL_UUID]');
    console.log('   If SCHOOL_UUID is omitted, it will try to find it from the user record.');
} else {
    async function run() {
        let schoolId = process.argv[3];

        if (!schoolId) {
            // Find school from user
            const student = await prisma.student.findFirst({
                where: { userId: TARGET_USER_ID },
                select: { schoolId: true, name: true }
            });

            if (student) {
                console.log(`👤 Found Student: ${student.name}`);
                schoolId = student.schoolId;
            } else {
                console.error('❌ Student not found with that ID.');
                return;
            }
        }

        await fixAttendance(TARGET_USER_ID, schoolId);
    }

    run()
        .catch(e => console.error(e))
        .finally(async () => {
            await prisma.$disconnect();
        });
}
