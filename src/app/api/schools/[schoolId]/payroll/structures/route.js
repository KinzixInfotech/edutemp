// Salary Structures API
// GET - List all salary structures
// POST - Create new salary structure

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

// GET - List all salary structures for school
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get('isActive');

    try {
        const cacheKey = generateKey('payroll:structures', { schoolId, isActive });

        const structures = await remember(cacheKey, async () => {
            return prisma.salaryStructure.findMany({
                where: {
                    schoolId,
                    ...(isActive !== null && isActive !== undefined && { isActive: isActive === 'true' })
                },
                include: {
                    _count: {
                        select: { employees: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        }, 600); // Cache for 10 minutes

        // Transform to add employee count
        const formattedStructures = structures.map(s => ({
            ...s,
            employeeCount: s._count.employees
        }));

        return NextResponse.json(formattedStructures);
    } catch (error) {
        console.error('Salary structures fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch salary structures',
            details: error.message
        }, { status: 500 });
    }
}

// POST - Create new salary structure
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const data = await req.json();

    const {
        name,
        description,
        basicSalary,
        hraPercent,
        daPercent,
        taAmount,
        medicalAllowance,
        specialAllowance,
        otherAllowances
    } = data;

    if (!name || basicSalary === undefined) {
        return NextResponse.json({
            error: 'name and basicSalary are required'
        }, { status: 400 });
    }

    try {
        // Calculate gross salary
        const hra = (basicSalary * (hraPercent || 40)) / 100;
        const da = (basicSalary * (daPercent || 0)) / 100;
        const grossSalary = basicSalary + hra + da + (taAmount || 0) +
            (medicalAllowance || 0) + (specialAllowance || 0);

        // Calculate CTC (gross + employer PF + employer ESI)
        const employerPF = (basicSalary * 12) / 100;
        const employerESI = grossSalary <= 21000 ? (grossSalary * 3.25) / 100 : 0;
        const ctc = grossSalary + employerPF + employerESI;

        const structure = await prisma.salaryStructure.create({
            data: {
                schoolId,
                name,
                description,
                basicSalary,
                hraPercent: hraPercent || 40,
                daPercent: daPercent || 0,
                taAmount: taAmount || 0,
                medicalAllowance: medicalAllowance || 0,
                specialAllowance: specialAllowance || 0,
                otherAllowances,
                grossSalary,
                ctc,
                isActive: true
            }
        });

        // Invalidate cache
        await invalidatePattern(`payroll:structures:${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: 'Salary structure created successfully',
            structure
        });
    } catch (error) {
        console.error('Salary structure create error:', error);

        // Check for unique constraint
        if (error.code === 'P2002') {
            return NextResponse.json({
                error: 'A salary structure with this name already exists'
            }, { status: 400 });
        }

        return NextResponse.json({
            error: 'Failed to create salary structure',
            details: error.message
        }, { status: 500 });
    }
}
