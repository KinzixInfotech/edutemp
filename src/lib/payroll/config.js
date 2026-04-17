import prisma from '@/lib/prisma';

export async function getPayrollConfigForSchool(schoolId) {
  if (!schoolId) {
    throw new Error('schoolId is required');
  }

  return prisma.payrollConfig.upsert({
    where: { schoolId },
    update: {},
    create: { schoolId },
  });
}

export function calculateOvertimeEarnings({
  overtimeHours = 0,
  overtimeRate = 1,
  grossSalary = 0,
  standardWorkingDays = 26,
  standardWorkingHours = 8,
}) {
  if (!Number.isFinite(overtimeHours) || overtimeHours <= 0) {
    return 0;
  }

  const effectiveDays = Number.isFinite(standardWorkingDays) && standardWorkingDays > 0
    ? standardWorkingDays
    : 26;
  const effectiveHours = Number.isFinite(standardWorkingHours) && standardWorkingHours > 0
    ? standardWorkingHours
    : 8;
  const hourlyRate = grossSalary / (effectiveDays * effectiveHours);

  return Number((hourlyRate * overtimeHours * overtimeRate).toFixed(2));
}
