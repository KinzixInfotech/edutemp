// ============================================
// API: /api/schools/fee/global-structures/route.js
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { paginate, getPagination, apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

// ─── Helper: calculate annual total respecting billing types ─────────────────
function calcTotalAmount(particulars) {
    return particulars.reduce((sum, p) => {
        const mult = p.type === 'MONTHLY' ? 12 : p.type === 'TERM' ? 4 : 1;
        return sum + ((p.amount || 0) * mult);
    }, 0);
}

// ─── Helper: derive a FeeMode from particulars for backward compat ────────────
function deriveModeFromParticulars(particulars) {
    const types = particulars.map(p => p.type || 'MONTHLY');
    if (types.includes('MONTHLY')) return 'MONTHLY';
    if (types.includes('TERM')) return 'QUARTERLY';
    if (types.includes('ANNUAL')) return 'YEARLY';
    return 'ONE_TIME';
}

// ─── Helper: generate installment rules from mode + totalAmount + year ────────
function generateInstallmentRules(mode, totalAmount, academicYearStart, academicYearEnd) {
    const startDate = new Date(academicYearStart);
    const endDate = academicYearEnd ? new Date(academicYearEnd) : null;

    let numberOfInstallments = 1;
    if (endDate && mode === 'MONTHLY') {
        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12
            + (endDate.getMonth() - startDate.getMonth()) + 1;
        numberOfInstallments = Math.max(1, Math.min(months, 12));
    } else {
        switch (mode) {
            case 'MONTHLY': numberOfInstallments = 12; break;
            case 'QUARTERLY': numberOfInstallments = 4; break;
            case 'HALF_YEARLY': numberOfInstallments = 2; break;
            default: numberOfInstallments = 1;
        }
    }

    const baseAmount = Math.floor((totalAmount / numberOfInstallments) * 100) / 100;
    const remainder = Math.round((totalAmount - baseAmount * numberOfInstallments) * 100) / 100;
    const pctPerInst = Math.round((100 / numberOfInstallments) * 100) / 100;

    const rules = [];
    for (let i = 0; i < numberOfInstallments; i++) {
        const dueDate = new Date(startDate);
        if (mode === 'MONTHLY') {
            dueDate.setMonth(startDate.getMonth() + i);
            dueDate.setDate(10);
        } else if (mode === 'QUARTERLY') {
            dueDate.setMonth(startDate.getMonth() + i * 3);
            dueDate.setDate(15);
        } else if (mode === 'HALF_YEARLY') {
            dueDate.setMonth(startDate.getMonth() + i * 6);
            dueDate.setDate(15);
        } else {
            dueDate.setDate(15);
        }
        const isLast = i === numberOfInstallments - 1;
        rules.push({
            installmentNumber: i + 1,
            dueDate: dueDate.toISOString(),
            percentage: pctPerInst,
            amount: isLast ? baseAmount + remainder : baseAmount,
            lateFeeAmount: 0,
            lateFeeAfterDays: 0,
        });
    }
    return rules;
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('schoolId');
        const academicYearId = searchParams.get('academicYearId');
        const classId = searchParams.get('classId');
        const status = searchParams.get('status');
        const includeArchived = searchParams.get('includeArchived') === 'true';

        if (!schoolId) return errorResponse('schoolId required', 400);

        const { page, limit } = getPagination(req);
        const cacheKey = generateKey('fee-structures', { schoolId, academicYearId, classId, status, includeArchived, page, limit });

        const result = await remember(cacheKey, async () => {
            const where = {
                schoolId,
                ...(academicYearId && { academicYearId }),
                ...(classId && { classId: parseInt(classId) }),
                isActive: true,
                ...(status && status !== 'all' && { status }),
                ...(!includeArchived && !status && { status: { not: 'ARCHIVED' } }),
            };

            return await paginate(prisma.globalFeeStructure, {
                where,
                include: {
                    academicYear: { select: { name: true, startDate: true, endDate: true } },
                    class: { select: { className: true } },
                    particulars: { orderBy: { displayOrder: 'asc' } },
                    installmentRules: { orderBy: { installmentNumber: 'asc' } },
                    _count: { select: { studentFees: true } },
                },
                orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
            }, page, limit);
        }, 300);

        return apiResponse(result.data);
    } catch (error) {
        console.error('GET Global Fee Structures Error:', error);
        return errorResponse('Failed to fetch fee structures');
    }
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req) {
    try {
        const body = await req.json();
        const {
            schoolId,
            academicYearId,
            classId,
            name,
            description,
            particulars,
            installmentRules,
            // mode is optional — we derive it from particulars if not sent
            mode: modeFromBody,
        } = body;

        if (!schoolId || !academicYearId || !classId || !name || !particulars?.length) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Fetch academic year for installment date generation
            const academicYear = await tx.academicYear.findUnique({
                where: { id: academicYearId },
                select: { startDate: true, endDate: true },
            });
            if (!academicYear) throw new Error('Academic year not found');

            // Check duplicate
            const existing = await tx.globalFeeStructure.findUnique({
                where: { schoolId_academicYearId_classId: { schoolId, academicYearId, classId } },
            });
            if (existing) throw new Error(`Fee structure already exists for this class (Status: ${existing.status}).`);

            // ✅ Calculate totalAmount using billing-type multipliers
            const totalAmount = calcTotalAmount(particulars);

            // Derive mode from particulars if not explicitly sent
            const mode = modeFromBody || deriveModeFromParticulars(particulars);

            // Create structure with all particular fields
            const structure = await tx.globalFeeStructure.create({
                data: {
                    schoolId,
                    academicYearId,
                    classId,
                    name,
                    description,
                    mode,
                    totalAmount,
                    status: 'DRAFT',
                    particulars: {
                        create: particulars.map((p, i) => ({
                            name: p.name,
                            amount: p.amount,
                            type: p.type || 'MONTHLY',
                            category: p.category || 'TUITION',
                            chargeTiming: p.chargeTiming || 'SESSION_START',
                            serviceId: p.serviceId || null,
                            lateFeeRuleId: p.lateFeeRuleId || null,
                            applicableMonths: p.applicableMonths ? JSON.stringify(p.applicableMonths) : null,
                            isOptional: p.isOptional || false,
                            displayOrder: i,
                        })),
                    },
                },
                include: { particulars: true },
            });

            // Generate or use provided installment rules
            const rulesToCreate = installmentRules?.length > 0
                ? installmentRules
                : generateInstallmentRules(mode, totalAmount, academicYear.startDate, academicYear.endDate);

            await tx.feeInstallmentRule.createMany({
                data: rulesToCreate.map(rule => ({
                    globalFeeStructureId: structure.id,
                    installmentNumber: rule.installmentNumber,
                    dueDate: new Date(rule.dueDate),
                    percentage: rule.percentage,
                    amount: rule.amount,
                    lateFeeAmount: rule.lateFeeAmount || 0,
                    lateFeeAfterDays: rule.lateFeeAfterDays || 0,
                })),
            });

            return structure;
        });

        await invalidatePattern(`fee-structures:*schoolId:${schoolId}*`);

        return NextResponse.json({
            message: 'Fee structure created successfully',
            structure: result,
        }, { status: 201 });

    } catch (error) {
        console.error('POST Global Fee Structure Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create fee structure' }, { status: 400 });
    }
}

// ─── PATCH ───────────────────────────────────────────────────────────────────
export async function PATCH(req) {
    try {
        const body = await req.json();
        const { id, action, name, description, particulars, installmentRules, targetAcademicYearId, newName } = body;

        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const structure = await prisma.globalFeeStructure.findUnique({
            where: { id },
            include: { particulars: true, installmentRules: true },
        });
        if (!structure) return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 });

        // ── archive ──────────────────────────────────────────────────────────
        if (action === 'archive') {
            if (structure.status !== 'ACTIVE') {
                return NextResponse.json({ error: 'Only ACTIVE structures can be archived' }, { status: 400 });
            }
            const updated = await prisma.globalFeeStructure.update({ where: { id }, data: { status: 'ARCHIVED' } });
            await invalidatePattern(`fee-structures:*schoolId:${structure.schoolId}*`);
            return NextResponse.json({ message: 'Fee structure archived', structure: updated });
        }

        // ── unarchive ─────────────────────────────────────────────────────────
        if (action === 'unarchive') {
            if (structure.status !== 'ARCHIVED') {
                return NextResponse.json({ error: 'Only ARCHIVED structures can be restored' }, { status: 400 });
            }
            const updated = await prisma.globalFeeStructure.update({ where: { id }, data: { status: 'ACTIVE' } });
            await invalidatePattern(`fee-structures:*schoolId:${structure.schoolId}*`);
            return NextResponse.json({ message: 'Fee structure restored to ACTIVE', structure: updated });
        }

        // ── clone ─────────────────────────────────────────────────────────────
        if (action === 'clone') {
            const cloneName = newName || `${structure.name} (Copy)`;
            const cloneYearId = targetAcademicYearId || structure.academicYearId;

            const existing = await prisma.globalFeeStructure.findUnique({
                where: {
                    schoolId_academicYearId_classId: {
                        schoolId: structure.schoolId,
                        academicYearId: cloneYearId,
                        classId: structure.classId,
                    },
                },
            });
            if (existing) {
                return NextResponse.json({ error: 'Fee structure already exists for this class in target year' }, { status: 400 });
            }

            const cloned = await prisma.$transaction(async (tx) => {
                const newStructure = await tx.globalFeeStructure.create({
                    data: {
                        schoolId: structure.schoolId,
                        academicYearId: cloneYearId,
                        classId: structure.classId,
                        name: cloneName,
                        description: structure.description,
                        mode: structure.mode,
                        totalAmount: structure.totalAmount,
                        status: 'DRAFT',
                        version: structure.version + 1,
                        clonedFromId: structure.id,
                        particulars: {
                            create: structure.particulars.map(p => ({
                                name: p.name,
                                amount: p.amount,
                                type: p.type || 'MONTHLY',
                                category: p.category,
                                chargeTiming: p.chargeTiming || 'SESSION_START',
                                serviceId: p.serviceId || null,
                                lateFeeRuleId: p.lateFeeRuleId || null,
                                applicableMonths: p.applicableMonths || null,
                                isOptional: p.isOptional,
                                displayOrder: p.displayOrder,
                            })),
                        },
                    },
                    include: { particulars: true },
                });

                if (structure.installmentRules.length > 0) {
                    await tx.feeInstallmentRule.createMany({
                        data: structure.installmentRules.map(rule => ({
                            globalFeeStructureId: newStructure.id,
                            installmentNumber: rule.installmentNumber,
                            dueDate: rule.dueDate,
                            percentage: rule.percentage,
                            amount: rule.amount,
                            lateFeeAmount: rule.lateFeeAmount,
                            lateFeeAfterDays: rule.lateFeeAfterDays,
                        })),
                    });
                }

                return newStructure;
            });

            await invalidatePattern(`fee-structures:*schoolId:${structure.schoolId}*`);
            return NextResponse.json({ message: 'Fee structure cloned', structure: cloned }, { status: 201 });
        }

        // ── regular update (DRAFT only) ───────────────────────────────────────
        if (structure.status !== 'DRAFT') {
            return NextResponse.json({
                error: `Cannot edit ${structure.status} structure. Only DRAFT structures can be modified.`,
            }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.globalFeeStructure.update({
                where: { id },
                data: {
                    ...(name !== undefined && { name }),
                    ...(description !== undefined && { description }),
                },
            });

            if (particulars) {
                // Delete existing and recreate
                await tx.globalFeeParticular.deleteMany({ where: { globalFeeStructureId: id } });

                // ✅ Use billing-type multipliers for totalAmount
                const totalAmount = calcTotalAmount(particulars);

                await tx.globalFeeParticular.createMany({
                    data: particulars.map((p, index) => ({
                        globalFeeStructureId: id,
                        name: p.name,
                        amount: p.amount,
                        type: p.type || 'MONTHLY',
                        category: p.category || 'TUITION',
                        chargeTiming: p.chargeTiming || 'SESSION_START',
                        serviceId: p.serviceId || null,
                        lateFeeRuleId: p.lateFeeRuleId || null,
                        applicableMonths: p.applicableMonths ? JSON.stringify(p.applicableMonths) : null,
                        isOptional: p.isOptional || false,
                        displayOrder: index,
                    })),
                });

                // Update totalAmount and mode on the parent structure
                const newMode = deriveModeFromParticulars(particulars);
                await tx.globalFeeStructure.update({
                    where: { id },
                    data: { totalAmount, mode: newMode },
                });
            }

            if (installmentRules) {
                await tx.feeInstallmentRule.deleteMany({ where: { globalFeeStructureId: id } });

                if (installmentRules.length > 0) {
                    await tx.feeInstallmentRule.createMany({
                        data: installmentRules.map(rule => ({
                            globalFeeStructureId: id,
                            installmentNumber: rule.installmentNumber,
                            dueDate: new Date(rule.dueDate),
                            percentage: rule.percentage,
                            amount: rule.amount,
                            lateFeeAmount: rule.lateFeeAmount || 0,
                            lateFeeAfterDays: rule.lateFeeAfterDays || 0,
                        })),
                    });
                }
            }

            return updated;
        });

        await invalidatePattern(`fee-structures:*schoolId:${structure.schoolId}*`);
        return NextResponse.json({ message: 'Fee structure updated successfully', structure: result });

    } catch (error) {
        console.error('PATCH Global Fee Structure Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to update fee structure' }, { status: 400 });
    }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const structure = await prisma.globalFeeStructure.findUnique({ where: { id } });
        if (!structure) return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 });

        if (structure.status === 'ACTIVE') {
            return NextResponse.json({
                error: 'Cannot delete ACTIVE structure. Use Archive instead.',
                suggestion: 'archive',
                assignedCount: await prisma.studentFee.count({ where: { globalFeeStructureId: id } }),
            }, { status: 400 });
        }

        if (structure.status === 'ARCHIVED') {
            return NextResponse.json({
                error: 'Cannot delete ARCHIVED structure. It is kept for historical reference.',
            }, { status: 400 });
        }

        // Extra safety — even DRAFT shouldn't be deleted if students are assigned
        const assignedCount = await prisma.studentFee.count({ where: { globalFeeStructureId: id } });
        if (assignedCount > 0) {
            await prisma.globalFeeStructure.update({ where: { id }, data: { status: 'ACTIVE' } });
            return NextResponse.json({
                error: `Cannot delete: Structure has ${assignedCount} students assigned. Status updated to ACTIVE.`,
                suggestion: 'archive',
            }, { status: 400 });
        }

        const deleted = await prisma.globalFeeStructure.delete({ where: { id } });
        if (deleted?.schoolId) await invalidatePattern(`fee-structures:*schoolId:${deleted.schoolId}*`);

        return NextResponse.json({ message: 'Fee structure deleted successfully' });

    } catch (error) {
        console.error('DELETE Global Fee Structure Error:', error);
        return NextResponse.json({ error: 'Failed to delete fee structure' }, { status: 500 });
    }
}