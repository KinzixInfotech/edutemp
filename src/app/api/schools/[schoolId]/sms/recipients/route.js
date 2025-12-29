import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';

// GET - Fetch recipient phone numbers based on type
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'parents';
        const classId = searchParams.get('classId');
        const sectionId = searchParams.get('sectionId');

        // Cache key for this specific query
        const cacheKey = `sms:recipients:${schoolId}:${type}:${classId || 'all'}:${sectionId || 'all'}`;

        // Try cache first (5 minute cache)
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                // Handle both string and object formats from Redis
                const parsedCache = typeof cached === 'string' ? JSON.parse(cached) : cached;
                return NextResponse.json(parsedCache);
            }
        } catch (cacheError) {
            console.log('[SMS RECIPIENTS] Cache read error, continuing without cache:', cacheError.message);
        }

        let recipients = [];

        switch (type) {
            case 'parents': {
                // Get all parents for this school (from Student table + Parent table)
                // This ensures we get specific Father/Mother numbers even if Parent record doesn't exist
                const students = await prisma.student.findMany({
                    where: { schoolId },
                    select: {
                        FatherNumber: true,
                        MotherNumber: true,
                        parentId: true,
                    },
                });

                const numbers = new Set();
                const parentIds = students
                    .map(s => s.parentId)
                    .filter(id => id != null);

                // Fetch linked parents
                const linkedParents = parentIds.length > 0 ? await prisma.parent.findMany({
                    where: {
                        id: { in: parentIds },
                        status: 'ACTIVE',
                    },
                    select: { id: true, contactNumber: true },
                }) : [];

                const parentContactMap = new Map(
                    linkedParents.map(p => [p.id, p.contactNumber])
                );

                for (const student of students) {
                    if (student.FatherNumber && student.FatherNumber.length >= 10) numbers.add(student.FatherNumber);
                    if (student.MotherNumber && student.MotherNumber.length >= 10) numbers.add(student.MotherNumber);

                    if (student.parentId && parentContactMap.has(student.parentId)) {
                        const pc = parentContactMap.get(student.parentId);
                        if (pc && pc.length >= 10) numbers.add(pc);
                    }
                }

                // Also fetch standalone parents that might not be linked to students yet (unlikely but safe)
                // or just rely on the above if "Parents" means "Parents of students"

                recipients = Array.from(numbers);
                break;
            }

            case 'parent_class': {
                // Get parents of students in specific class/section
                const studentWhere = {
                    schoolId,
                };
                if (classId && classId !== 'all') {
                    studentWhere.classId = parseInt(classId);
                }
                if (sectionId && sectionId !== 'all') {
                    studentWhere.sectionId = parseInt(sectionId);
                }

                const students = await prisma.student.findMany({
                    where: studentWhere,
                    select: {
                        FatherNumber: true,
                        MotherNumber: true,
                        contactNumber: true,
                        parentId: true,
                    },
                });

                // Collect all parent numbers
                const numbers = new Set();

                // Get all unique parent IDs to fetch linked parents in one query
                const parentIds = students
                    .map(s => s.parentId)
                    .filter(id => id != null);

                // Fetch all linked parents at once
                const linkedParents = parentIds.length > 0 ? await prisma.parent.findMany({
                    where: {
                        id: { in: parentIds },
                        status: 'ACTIVE',
                    },
                    select: {
                        id: true,
                        contactNumber: true,
                    },
                }) : [];

                // Create a map for quick lookup
                const parentContactMap = new Map(
                    linkedParents.map(p => [p.id, p.contactNumber])
                );

                // Collect all numbers
                for (const student of students) {
                    if (student.FatherNumber && student.FatherNumber.length >= 10) {
                        numbers.add(student.FatherNumber);
                    }
                    if (student.MotherNumber && student.MotherNumber.length >= 10) {
                        numbers.add(student.MotherNumber);
                    }
                    // Add linked parent's contact
                    if (student.parentId && parentContactMap.has(student.parentId)) {
                        const parentContact = parentContactMap.get(student.parentId);
                        if (parentContact && parentContact.length >= 10) {
                            numbers.add(parentContact);
                        }
                    }
                }
                recipients = Array.from(numbers);
                break;
            }

            case 'students': {
                // Get student contact numbers
                const students = await prisma.student.findMany({
                    where: { schoolId },
                    select: { contactNumber: true },
                });
                recipients = students
                    .map(s => s.contactNumber)
                    .filter(n => n && n.length >= 10);
                break;
            }

            case 'teachers': {
                // Get teaching staff contact numbers
                const teachers = await prisma.teachingStaff.findMany({
                    where: { schoolId },
                    select: { contactNumber: true },
                });
                recipients = teachers
                    .map(t => t.contactNumber)
                    .filter(n => n && n.length >= 10);
                break;
            }

            case 'non_teaching': {
                // Get non-teaching staff contact numbers
                const staff = await prisma.nonTeachingStaff.findMany({
                    where: { schoolId },
                    select: { contactNumber: true },
                });
                recipients = staff
                    .map(s => s.contactNumber)
                    .filter(n => n && n.length >= 10);
                break;
            }

            case 'all_staff': {
                // Get both teaching and non-teaching staff
                const [teachers, nonTeaching] = await Promise.all([
                    prisma.teachingStaff.findMany({
                        where: { schoolId },
                        select: { contactNumber: true },
                    }),
                    prisma.nonTeachingStaff.findMany({
                        where: { schoolId },
                        select: { contactNumber: true },
                    }),
                ]);

                const numbers = new Set();
                teachers.forEach(t => {
                    if (t.contactNumber && t.contactNumber.length >= 10) {
                        numbers.add(t.contactNumber);
                    }
                });
                nonTeaching.forEach(s => {
                    if (s.contactNumber && s.contactNumber.length >= 10) {
                        numbers.add(s.contactNumber);
                    }
                });
                recipients = Array.from(numbers);
                break;
            }

            default:
                recipients = [];
        }

        // Clean and deduplicate numbers
        recipients = [...new Set(
            recipients
                .map(n => n.replace(/\D/g, '')) // Remove non-digits
                .filter(n => n.length === 10 || n.length === 12) // Valid lengths
                .map(n => n.length === 12 && n.startsWith('91') ? n.slice(2) : n) // Remove 91 prefix
        )];

        const result = {
            type,
            recipients,
            count: recipients.length,
        };

        // Cache for 5 minutes - ensure it's properly stringified
        try {
            await redis.set(cacheKey, JSON.stringify(result), { ex: 300 });
        } catch (cacheError) {
            console.log('[SMS RECIPIENTS] Cache write error:', cacheError.message);
            // Continue without caching
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('[SMS RECIPIENTS ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch recipients', details: error.message },
            { status: 500 }
        );
    }
}
