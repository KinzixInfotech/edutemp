// Individual Salary Structure API
// GET - Get salary structure by ID
// PUT - Update salary structure
// DELETE - Delete/deactivate salary structure

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from "@/lib/cache";

// GET - Get salary structure
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, structureId } = params;

    try {
        const structure = await prisma.salaryStructure.findUnique({
            where: { id: structureId },
            include: {
                employees: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                profilePicture: true
                            }
                        }
                    }
                }
            }
        });

        if (!structure) {
            return NextResponse.json({
                error: 'Salary structure not found'
            }, { status: 404 });
        }

        if (structure.schoolId !== schoolId) {
            return NextResponse.json({
                error: 'Unauthorized'
            }, { status: 403 });
        }

        return NextResponse.json(structure);
    } catch (error) {
        console.error('Salary structure fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch salary structure',
            details: error.message
        }, { status: 500 });
    }
}

// PUT - Update salary structure
export async function PUT(req, props) {
    const params = await props.params;
    const { schoolId, structureId } = params;
    const data = await req.json();

    try {
        const existing = await prisma.salaryStructure.findUnique({
            where: { id: structureId }
        });

        if (!existing) {
            return NextResponse.json({
                error: 'Salary structure not found'
            }, { status: 404 });
        }

        if (existing.schoolId !== schoolId) {
            return NextResponse.json({
                error: 'Unauthorized'
            }, { status: 403 });
        }

        // Recalculate gross and CTC if salary components changed
        const basicSalary = data.basicSalary ?? existing.basicSalary;
        const hraPercent = data.hraPercent ?? existing.hraPercent;
        const daPercent = data.daPercent ?? existing.daPercent;
        const taAmount = data.taAmount ?? existing.taAmount;
        const medicalAllowance = data.medicalAllowance ?? existing.medicalAllowance;
        const specialAllowance = data.specialAllowance ?? existing.specialAllowance;

        const hra = (basicSalary * hraPercent) / 100;
        const da = (basicSalary * daPercent) / 100;
        const grossSalary = basicSalary + hra + da + taAmount + medicalAllowance + specialAllowance;

        const employerPF = (basicSalary * 12) / 100;
        const employerESI = grossSalary <= 21000 ? (grossSalary * 3.25) / 100 : 0;
        const ctc = grossSalary + employerPF + employerESI;

        const structure = await prisma.salaryStructure.update({
            where: { id: structureId },
            data: {
                name: data.name,
                description: data.description,
                basicSalary,
                hraPercent,
                daPercent,
                taAmount,
                medicalAllowance,
                specialAllowance,
                otherAllowances: data.otherAllowances,
                grossSalary,
                ctc,
                isActive: data.isActive
            }
        });

        // Invalidate cache
        await invalidatePattern(`payroll:structures:${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: 'Salary structure updated',
            structure
        });
    } catch (error) {
        console.error('Salary structure update error:', error);
        return NextResponse.json({
            error: 'Failed to update salary structure',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE - Deactivate salary structure
export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId, structureId } = params;

    try {
        const existing = await prisma.salaryStructure.findUnique({
            where: { id: structureId },
            include: {
                _count: { select: { employees: true } }
            }
        });

        if (!existing) {
            return NextResponse.json({
                error: 'Salary structure not found'
            }, { status: 404 });
        }

        if (existing.schoolId !== schoolId) {
            return NextResponse.json({
                error: 'Unauthorized'
            }, { status: 403 });
        }

        // Check if any employees are using this structure
        if (existing._count.employees > 0) {
            // Soft delete - just deactivate
            await prisma.salaryStructure.update({
                where: { id: structureId },
                data: { isActive: false }
            });

            return NextResponse.json({
                success: true,
                message: 'Salary structure deactivated (employees still assigned)'
            });
        }

        // Hard delete if no employees
        await prisma.salaryStructure.delete({
            where: { id: structureId }
        });

        // Invalidate cache
        await invalidatePattern(`payroll:structures:${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: 'Salary structure deleted'
        });
    } catch (error) {
        console.error('Salary structure delete error:', error);
        return NextResponse.json({
            error: 'Failed to delete salary structure',
            details: error.message
        }, { status: 500 });
    }
}
