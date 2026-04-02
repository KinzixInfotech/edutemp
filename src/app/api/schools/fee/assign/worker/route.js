// ═══════════════════════════════════════════════════════════════
// FILE: app/api/schools/fee/assign/worker/route.js
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import qstash from '@/lib/qstash';
import prisma from '@/lib/prisma';
import { getJob, updateJob } from '../route';
import { sendNotification } from '@/lib/notifications/notificationHelper';

const CHUNK_SIZE = 25;
const IS_DEV = process.env.NODE_ENV === 'development';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'edubreezy_internal';

// ── Core handler logic (shared between dev + prod paths) ───────
async function handleWorker(req) {
    const { jobId } = await req.json();

    if (!jobId) {
        return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    const job = await getJob(jobId);
    if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'done' || job.status === 'error') {
        return NextResponse.json({ message: 'Job already complete' });
    }

    // Cancelled by user — stop processing
    if (job.status === 'cancelled') {
        return NextResponse.json({ message: 'Job cancelled', done: job.done, total: job.total });
    }

    const { globalFeeStructureId, academicYearId, schoolId, studentIds, processedCount } = job;

    // ── Load fee structure ─────────────────────────────────────
    const structure = await prisma.globalFeeStructure.findUnique({
        where: { id: globalFeeStructureId },
        include: {
            particulars: { orderBy: { displayOrder: 'asc' } },
            installmentRules: { orderBy: { installmentNumber: 'asc' } },
        },
    });

    if (!structure) {
        await updateJob(jobId, { status: 'error', errorMsg: 'Fee structure not found' });
        return NextResponse.json({ error: 'Structure not found' }, { status: 404 });
    }

    // ── Slice current chunk ────────────────────────────────────
    const start = processedCount || 0;
    const chunk = studentIds.slice(start, start + CHUNK_SIZE);

    if (!chunk.length) {
        await updateJob(jobId, { status: 'done' });
        await notifyAdmin(job, structure.name);
        return NextResponse.json({ message: 'All done' });
    }

    // ── Process chunk ──────────────────────────────────────────
    let chunkDone = 0;
    let chunkFailed = 0;

    for (const studentId of chunk) {
        try {
            await assignFeeToStudent({ studentId, structure, academicYearId, schoolId });
            chunkDone++;
        } catch (err) {
            chunkFailed++;
            console.error(`[FeeAssign Worker] Failed for ${studentId}:`, err.message);
        }
    }

    const newProcessed = start + chunk.length;
    const newDone = (job.done || 0) + chunkDone;
    const newFailed = (job.failed || 0) + chunkFailed;
    const allDone = newProcessed >= studentIds.length;

    await updateJob(jobId, {
        done: newDone,
        failed: newFailed,
        processedCount: newProcessed,
        status: allDone ? 'done' : 'running',
    });

    // ── Chain next chunk ───────────────────────────────────────
    if (!allDone) {
        const base = process.env.APP_URL || 'https://www.edubreezy.com';
        const workerUrl = `${base}/api/schools/fee/assign/worker`;

        if (IS_DEV) {
            // Local: call directly with internal key (no QStash signature)
            fetch(workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-internal-key': INTERNAL_KEY,
                },
                body: JSON.stringify({ jobId }),
            }).catch(e => console.error('[FeeAssign] Chain fetch failed:', e));
        } else {
            // Production: use QStash
            await qstash.publishJSON({
                url: workerUrl,
                body: { jobId },
                retries: 3,
            });
        }
    } else {
        await notifyAdmin(job, structure.name, newDone, newFailed);
    }

    return NextResponse.json({
        chunk: chunk.length,
        done: newDone,
        failed: newFailed,
        remaining: studentIds.length - newProcessed,
        status: allDone ? 'done' : 'running',
    });
}

// ── Route export — QStash verification in prod, key check in dev ─
export async function POST(req) {
    if (IS_DEV) {
        // Dev: verify internal key instead of QStash signature
        const key = req.headers.get('x-internal-key');
        if (key !== INTERNAL_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return handleWorker(req);
    }

    // Production: full QStash signature verification
    return verifySignatureAppRouter(handleWorker)(req);
}

// ── Notify admin ───────────────────────────────────────────────
async function notifyAdmin(job, structureName, done, failed) {
    try {
        await sendNotification({
            schoolId: job.schoolId,
            title: 'Fee Assignment Complete',
            message: `${done ?? job.done} students assigned to "${structureName}".${(failed ?? job.failed) > 0 ? ` ${failed ?? job.failed} failed.` : ''}`,
            type: 'FEE',
            priority: (failed ?? job.failed) > 0 ? 'HIGH' : 'NORMAL',
            icon: '💰',
            targetOptions: { roleNames: ['ADMIN'] },
        });
    } catch (e) {
        console.warn('[FeeAssign Worker] Admin notification failed:', e.message);
    }
}

// ── Assign fee to one student ──────────────────────────────────
async function assignFeeToStudent({ studentId, structure, academicYearId, schoolId }) {
    const { id: globalFeeStructureId, totalAmount, particulars, installmentRules } = structure;

    // Filter out optional particulars — they require per-student opt-in via Services tab
    const requiredParticulars = particulars.filter(p => !p.isOptional);
    const requiredTotal = requiredParticulars.reduce((sum, p) => sum + p.amount, 0);

    await prisma.$transaction(async tx => {
        const studentFee = await tx.studentFee.create({
            data: {
                studentId,
                schoolId,
                academicYearId,
                globalFeeStructureId,
                originalAmount: requiredTotal,
                discountAmount: 0,
                finalAmount: requiredTotal,
                paidAmount: 0,
                balanceAmount: requiredTotal,
                status: 'UNPAID',
                isCustom: false,
            },
        });

        if (requiredParticulars.length > 0) {
            await tx.studentFeeParticular.createMany({
                data: requiredParticulars.map(p => ({
                    studentFeeId: studentFee.id,
                    globalParticularId: p.id,
                    name: p.name,
                    amount: p.amount,
                    paidAmount: 0,
                    status: 'UNPAID',
                })),
            });
        }

        if (installmentRules.length > 0) {
            await tx.studentFeeInstallment.createMany({
                data: installmentRules.map(rule => ({
                    studentFeeId: studentFee.id,
                    installmentRuleId: rule.id,
                    installmentNumber: rule.installmentNumber,
                    dueDate: rule.dueDate,
                    amount: rule.amount,
                    paidAmount: 0,
                    status: 'PENDING',
                    lateFee: 0,
                    isOverdue: false,
                })),
            });
        }
    });
}