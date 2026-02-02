// app/api/schools/[schoolId]/biometric/rfid/bulk/route.js
// Bulk RFID card assignment

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createISAPIClient } from '@/lib/biometric/isapi-client';

/**
 * POST - Bulk assign RFID cards
 */
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json();
        const { assignments, deviceId, syncToDevice = false } = body;

        // Validation
        if (!Array.isArray(assignments) || assignments.length === 0) {
            return NextResponse.json(
                { error: 'assignments must be a non-empty array' },
                { status: 400 }
            );
        }

        if (assignments.length > 100) {
            return NextResponse.json(
                { error: 'Maximum 100 assignments per batch' },
                { status: 400 }
            );
        }

        // Validate each assignment
        const validationErrors = [];
        const cardUids = new Set();

        for (let i = 0; i < assignments.length; i++) {
            const { userId, cardUid } = assignments[i];

            if (!userId || !cardUid) {
                validationErrors.push({ index: i, error: 'Missing userId or cardUid' });
                continue;
            }

            if (!/^[A-Fa-f0-9]{4,32}$/.test(cardUid)) {
                validationErrors.push({ index: i, cardUid, error: 'Invalid card UID format' });
                continue;
            }

            // Check for duplicates in batch
            const normalizedUid = cardUid.toUpperCase();
            if (cardUids.has(normalizedUid)) {
                validationErrors.push({ index: i, cardUid, error: 'Duplicate card in batch' });
                continue;
            }
            cardUids.add(normalizedUid);
        }

        if (validationErrors.length > 0) {
            return NextResponse.json(
                { error: 'Validation errors', details: validationErrors },
                { status: 400 }
            );
        }

        // Check for existing cards
        const existingCards = await prisma.rfidIdentityMap.findMany({
            where: {
                cardUid: { in: Array.from(cardUids) },
                isActive: true,
            },
            select: { cardUid: true, userId: true },
        });

        if (existingCards.length > 0) {
            return NextResponse.json(
                {
                    error: 'Some cards are already assigned',
                    existingCards: existingCards.map((c) => ({
                        cardUidMasked: '****' + c.cardUid.slice(-4),
                    })),
                },
                { status: 409 }
            );
        }

        // Verify all users exist and are active
        const userIds = [...new Set(assignments.map((a) => a.userId))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds }, schoolId, status: 'ACTIVE' },
            select: { id: true },
        });

        const activeUserIds = new Set(users.map((u) => u.id));
        const invalidUsers = userIds.filter((id) => !activeUserIds.has(id));

        if (invalidUsers.length > 0) {
            return NextResponse.json(
                { error: 'Some users not found or inactive', invalidUsers },
                { status: 400 }
            );
        }

        // Get target device if specified
        let targetDevice = null;
        if (deviceId) {
            targetDevice = await prisma.biometricDevice.findFirst({
                where: { id: deviceId, schoolId, supportsRfid: true },
            });
        }

        // Process assignments
        const results = [];
        const successfulMappings = [];

        for (const assignment of assignments) {
            const { userId, cardUid, cardNumber, cardType = 'MIFARE' } = assignment;
            const normalizedUid = cardUid.toUpperCase();

            try {
                // Revoke existing primary cards for this user
                await prisma.rfidIdentityMap.updateMany({
                    where: { userId, isActive: true, isPrimary: true },
                    data: { isPrimary: false },
                });

                // Create mapping
                const mapping = await prisma.rfidIdentityMap.create({
                    data: {
                        schoolId,
                        userId,
                        deviceId: targetDevice?.id,
                        cardUid: normalizedUid,
                        cardNumber,
                        cardType,
                        isActive: true,
                        isPrimary: true,
                    },
                });

                successfulMappings.push({
                    userId,
                    cardUid: normalizedUid,
                    mappingId: mapping.id,
                });

                results.push({
                    userId,
                    cardUidMasked: '****' + normalizedUid.slice(-4),
                    success: true,
                });
            } catch (error) {
                results.push({
                    userId,
                    cardUidMasked: '****' + normalizedUid.slice(-4),
                    success: false,
                    error: error.message,
                });
            }
        }

        // Batch sync to device if enabled
        let syncResults = null;
        if (syncToDevice && targetDevice && successfulMappings.length > 0) {
            syncResults = [];
            const client = createISAPIClient(targetDevice);

            for (const mapping of successfulMappings) {
                const identityMap = await prisma.biometricIdentityMap.findFirst({
                    where: { userId: mapping.userId, deviceId: targetDevice.id },
                });

                if (identityMap) {
                    try {
                        const result = await client.addCard(identityMap.deviceUserId, mapping.cardUid);
                        syncResults.push({
                            cardUidMasked: '****' + mapping.cardUid.slice(-4),
                            ...result,
                        });

                        // Update hasCard status
                        await prisma.biometricIdentityMap.update({
                            where: { id: identityMap.id },
                            data: { hasCard: true },
                        });
                    } catch (error) {
                        syncResults.push({
                            cardUidMasked: '****' + mapping.cardUid.slice(-4),
                            success: false,
                            error: error.message,
                        });
                    }
                }
            }
        }

        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;

        return NextResponse.json({
            success: true,
            message: `Processed ${assignments.length} assignments: ${successCount} success, ${failCount} failed`,
            results,
            syncResults,
            summary: {
                total: assignments.length,
                success: successCount,
                failed: failCount,
            },
        });
    } catch (error) {
        console.error('[RFID Bulk] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to process bulk assignment' },
            { status: 500 }
        );
    }
}

/**
 * GET - Get unmapped users for bulk assignment
 */
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const userType = searchParams.get('userType') || 'all';
    const classId = searchParams.get('classId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        // Build where clause for users without active RFID cards
        const whereClause = {
            schoolId,
            status: 'ACTIVE',
            rfidIdentityMaps: {
                none: { isActive: true },
            },
        };

        // Filter by user type
        if (userType === 'student') {
            whereClause.student = { isNot: null };
        } else if (userType === 'staff') {
            whereClause.OR = [
                { teacher: { isNot: null } },
                { nonTeachingStaff: { isNot: null } },
            ];
        }

        // Filter by class
        if (classId) {
            whereClause.student = { ...whereClause.student, classId: parseInt(classId) };
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where: whereClause,
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: { select: { name: true } },
                    student: {
                        select: {
                            name: true,
                            admissionNo: true,
                            class: { select: { className: true } },
                            section: { select: { name: true } },
                        },
                    },
                    teacher: { select: { employeeId: true } },
                    nonTeachingStaff: { select: { employeeId: true } },
                },
                orderBy: [{ student: { class: { className: 'asc' } } }, { name: 'asc' }],
            }),
            prisma.user.count({ where: whereClause }),
        ]);

        return NextResponse.json({
            success: true,
            users: users.map((u) => ({
                id: u.id,
                name: u.student?.name || u.name || u.email,
                email: u.email,
                role: u.role.name,
                employeeId: u.student?.admissionNo || u.teacher?.employeeId || u.nonTeachingStaff?.employeeId,
                class: u.student?.class?.className,
                section: u.student?.section?.name,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('[RFID Bulk] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch unmapped users' },
            { status: 500 }
        );
    }
}
