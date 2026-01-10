// app/api/schools/[schoolId]/attendance/admin/lock/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, delCache, generateKey } from '@/lib/cache';

// GET - Check lock status for a month/year
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const month = parseInt(searchParams.get('month')) || new Date().getMonth() + 1;
    const year = parseInt(searchParams.get('year')) || new Date().getFullYear();

    try {
        const cacheKey = generateKey('attendance-lock', { schoolId, month, year });

        const lock = await remember(cacheKey, async () => {
            return await prisma.attendanceLock.findUnique({
                where: { schoolId_month_year: { schoolId, month, year } },
                include: {
                    lockedByUser: { select: { id: true, name: true } },
                    unlockedByUser: { select: { id: true, name: true } }
                }
            });
        }, 300); // Cache for 5 minutes

        return NextResponse.json({
            month,
            year,
            isLocked: lock?.isLocked || false,
            lockedAt: lock?.lockedAt,
            lockedBy: lock?.lockedByUser?.name || null,
            unlockedAt: lock?.unlockedAt,
            unlockedBy: lock?.unlockedByUser?.name || null,
            unlockReason: lock?.unlockReason
        });
    } catch (error) {
        console.error('Attendance lock status error:', error);
        return NextResponse.json({ error: 'Failed to get lock status' }, { status: 500 });
    }
}

// POST - Lock attendance for a month/year (Admin only)
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json();
        const { month, year, userId } = body;

        if (!month || !year || !userId) {
            return NextResponse.json({ error: 'Month, year, and userId are required' }, { status: 400 });
        }

        // Upsert the lock record
        const lock = await prisma.attendanceLock.upsert({
            where: { schoolId_month_year: { schoolId, month, year } },
            create: {
                schoolId,
                month,
                year,
                isLocked: true,
                lockedAt: new Date(),
                lockedBy: userId
            },
            update: {
                isLocked: true,
                lockedAt: new Date(),
                lockedBy: userId,
                unlockedAt: null,
                unlockedBy: null,
                unlockReason: null
            },
            include: {
                lockedByUser: { select: { id: true, name: true } }
            }
        });

        // Invalidate cache
        const cacheKey = generateKey('attendance-lock', { schoolId, month, year });
        await delCache(cacheKey);

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'CREATE',
                tableName: 'AttendanceLock',
                rowId: lock.id,
                newData: { month, year, action: 'LOCKED' }
            }
        });

        return NextResponse.json({
            success: true,
            message: `Attendance for ${month}/${year} has been locked`,
            lock: {
                isLocked: lock.isLocked,
                lockedAt: lock.lockedAt,
                lockedBy: lock.lockedByUser?.name
            }
        });
    } catch (error) {
        console.error('Attendance lock error:', error);
        return NextResponse.json({ error: 'Failed to lock attendance' }, { status: 500 });
    }
}

// PATCH - Unlock attendance (Admin only, requires reason)
export async function PATCH(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json();
        const { month, year, userId, unlockReason } = body;

        if (!month || !year || !userId) {
            return NextResponse.json({ error: 'Month, year, and userId are required' }, { status: 400 });
        }

        if (!unlockReason || unlockReason.trim().length < 10) {
            return NextResponse.json({
                error: 'Unlock reason is required and must be at least 10 characters'
            }, { status: 400 });
        }

        // Find existing lock
        const existingLock = await prisma.attendanceLock.findUnique({
            where: { schoolId_month_year: { schoolId, month, year } }
        });

        if (!existingLock) {
            return NextResponse.json({ error: 'Lock record not found' }, { status: 404 });
        }

        if (!existingLock.isLocked) {
            return NextResponse.json({ error: 'Period is already unlocked' }, { status: 400 });
        }

        // Update the lock record
        const lock = await prisma.attendanceLock.update({
            where: { id: existingLock.id },
            data: {
                isLocked: false,
                unlockedAt: new Date(),
                unlockedBy: userId,
                unlockReason: unlockReason.trim()
            },
            include: {
                unlockedByUser: { select: { id: true, name: true } }
            }
        });

        // Invalidate cache
        const cacheKey = generateKey('attendance-lock', { schoolId, month, year });
        await delCache(cacheKey);

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'UPDATE',
                tableName: 'AttendanceLock',
                rowId: lock.id,
                oldData: { isLocked: true },
                newData: { month, year, action: 'UNLOCKED', reason: unlockReason }
            }
        });

        return NextResponse.json({
            success: true,
            message: `Attendance for ${month}/${year} has been unlocked`,
            lock: {
                isLocked: lock.isLocked,
                unlockedAt: lock.unlockedAt,
                unlockedBy: lock.unlockedByUser?.name,
                unlockReason: lock.unlockReason
            }
        });
    } catch (error) {
        console.error('Attendance unlock error:', error);
        return NextResponse.json({ error: 'Failed to unlock attendance' }, { status: 500 });
    }
}
