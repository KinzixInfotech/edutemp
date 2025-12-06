// Payroll Configuration API
// GET - Get payroll configuration
// PUT - Update payroll configuration

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, generateKey, delCache } from "@/lib/cache";

// GET - Get payroll configuration for school
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const cacheKey = generateKey('payroll:config', { schoolId });

        const config = await remember(cacheKey, async () => {
            let payrollConfig = await prisma.payrollConfig.findUnique({
                where: { schoolId }
            });

            // Create default config if not exists
            if (!payrollConfig) {
                payrollConfig = await prisma.payrollConfig.create({
                    data: {
                        schoolId,
                        payCycleDay: 1,
                        paymentDay: 7,
                        standardWorkingDays: 26,
                        standardWorkingHours: 8,
                        enablePF: true,
                        pfEmployerPercent: 12,
                        pfEmployeePercent: 12,
                        pfWageLimit: 15000,
                        enableESI: true,
                        esiEmployerPercent: 3.25,
                        esiEmployeePercent: 0.75,
                        esiWageLimit: 21000,
                        enableProfessionalTax: true,
                        enableTDS: true,
                        enableLeaveEncashment: false,
                        enableOvertime: false,
                        overtimeRate: 1.5,
                        lateGraceMinutes: 15,
                        halfDayThreshold: 4
                    }
                });
            }

            return payrollConfig;
        }, 3600); // Cache for 1 hour

        return NextResponse.json(config);
    } catch (error) {
        console.error('Payroll config fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch payroll configuration',
            details: error.message
        }, { status: 500 });
    }
}

// PUT - Update payroll configuration
export async function PUT(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const data = await req.json();

    try {
        const config = await prisma.payrollConfig.upsert({
            where: { schoolId },
            update: {
                payCycleDay: data.payCycleDay,
                paymentDay: data.paymentDay,
                standardWorkingDays: data.standardWorkingDays,
                standardWorkingHours: data.standardWorkingHours,
                enablePF: data.enablePF,
                pfEmployerPercent: data.pfEmployerPercent,
                pfEmployeePercent: data.pfEmployeePercent,
                pfWageLimit: data.pfWageLimit,
                enableESI: data.enableESI,
                esiEmployerPercent: data.esiEmployerPercent,
                esiEmployeePercent: data.esiEmployeePercent,
                esiWageLimit: data.esiWageLimit,
                enableProfessionalTax: data.enableProfessionalTax,
                professionalTaxSlab: data.professionalTaxSlab,
                enableTDS: data.enableTDS,
                tdsSlabs: data.tdsSlabs,
                enableLeaveEncashment: data.enableLeaveEncashment,
                leaveEncashmentRate: data.leaveEncashmentRate,
                enableOvertime: data.enableOvertime,
                overtimeRate: data.overtimeRate,
                lateGraceMinutes: data.lateGraceMinutes,
                halfDayThreshold: data.halfDayThreshold
            },
            create: {
                schoolId,
                ...data
            }
        });

        // Invalidate cache
        await delCache(generateKey('payroll:config', { schoolId }));

        return NextResponse.json({
            success: true,
            message: 'Payroll configuration updated',
            config
        });
    } catch (error) {
        console.error('Payroll config update error:', error);
        return NextResponse.json({
            error: 'Failed to update payroll configuration',
            details: error.message
        }, { status: 500 });
    }
}
