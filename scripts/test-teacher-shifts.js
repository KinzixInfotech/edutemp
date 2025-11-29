const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/schools';
// Use a known school ID or fetch one. For this script, I'll assume I need to find one.
// But since I can't easily find one without another request, I'll try to use a placeholder or ask the user to provide one if it fails.
// Actually, I can query the DB directly using Prisma if I run this as a script with Prisma client, but axios is better to test the API.
// I'll try to fetch schools first if possible, or just use a hardcoded one if I found one in previous steps.
// I didn't see any school ID in previous steps.
// I'll use Prisma to get a school ID first.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const school = await prisma.school.findFirst();
        if (!school) {
            console.error('No school found in database');
            return;
        }
        const schoolId = school.id;
        console.log(`Using School ID: ${schoolId}`);

        // Get necessary data for creating a shift
        const teacher = await prisma.teachingStaff.findFirst({ where: { schoolId } });
        const cls = await prisma.class.findFirst({ where: { schoolId } });
        const subject = await prisma.subject.findFirst({
            where: {
                class: {
                    schoolId: schoolId
                }
            }
        });
        const timeSlot = await prisma.timeSlot.findFirst({ where: { schoolId } });

        if (!teacher || !cls || !subject || !timeSlot) {
            console.error('Missing required data (teacher, class, subject, or timeSlot)');
            return;
        }

        console.log('Found prerequisites:', {
            teacherId: teacher.userId,
            classId: cls.id,
            subjectId: subject.id,
            timeSlotId: timeSlot.id
        });

        // 1. Create Shift
        const date = new Date().toISOString().split('T')[0]; // Today
        console.log(`Creating shift for date: ${date}`);

        const createPayload = {
            teacherId: teacher.userId,
            classId: cls.id,
            subjectId: subject.id,
            timeSlotId: timeSlot.id,
            date: date,
            notes: 'Test Shift'
        };

        // Note: We need to run the next app for this to work via API.
        // If the app is not running, this will fail.
        // I'll assume the app is running on localhost:3000 as indicated in the metadata.

        try {
            const createRes = await axios.post(`${BASE_URL}/${schoolId}/teacher-shifts`, createPayload);
            console.log('Create Shift Success:', createRes.data.id);
            const shiftId = createRes.data.id;

            // 2. Get Shifts
            const getRes = await axios.get(`${BASE_URL}/${schoolId}/teacher-shifts?startDate=${date}&endDate=${date}`);
            console.log('Get Shifts Success. Count:', getRes.data.length);
            const found = getRes.data.find(s => s.id === shiftId);
            if (found) {
                console.log('Verified created shift exists in list');
            } else {
                console.error('Created shift not found in list');
            }

            // 3. Update Shift
            const updatePayload = {
                notes: 'Updated Test Shift'
            };
            const updateRes = await axios.put(`${BASE_URL}/${schoolId}/teacher-shifts/${shiftId}`, updatePayload);
            console.log('Update Shift Success:', updateRes.data.notes === 'Updated Test Shift');

            // 4. Delete Shift
            const deleteRes = await axios.delete(`${BASE_URL}/${schoolId}/teacher-shifts/${shiftId}`);
            console.log('Delete Shift Success:', deleteRes.data.message);

        } catch (apiError) {
            console.error('API Error:', apiError.response ? apiError.response.data : apiError.message);
        }

    } catch (error) {
        console.error('Script Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
