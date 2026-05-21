import { withSchoolAccess } from "@/lib/api-auth"; // app/api/schools/transport/fees/payments/route.js
// Transport Fee Payments
// GET: List payments
// POST: Record payment

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateKey, remember, invalidatePattern } from '@/lib/cache';
import { assertOperationalStudentsForYear, resolveActiveAcademicYear } from '@/lib/enrollment/session-enrollment';

const CACHE_TTL = 120; // 2 minutes
export const GET = withSchoolAccess(async function GET(req) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get('schoolId');
  const studentId = searchParams.get('studentId');
  const transportFeeId = searchParams.get('transportFeeId');
  const status = searchParams.get('status');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = parseInt(searchParams.get('limit')) || 20;
  const skip = (page - 1) * limit;

  if (!schoolId && !studentId) {
    return NextResponse.json({ error: 'schoolId or studentId required' }, { status: 400 });
  }

  try {
    const cacheKey = generateKey('transport-fee-payments', { schoolId, studentId, status, page });

    const data = await remember(cacheKey, async () => {
      const where = {
        ...(status && { status }),
        ...((startDate || endDate) && {
          paymentDate: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) })
          }
        }),
        studentTransportFee: {
          ...(studentId && { studentId }),
          ...(transportFeeId && { transportFeeId }),
          transportFee: {
            ...(schoolId && { schoolId })
          }
        }
      };

      const [payments, total] = await Promise.all([
      prisma.transportFeePayment.findMany({
        where,
        include: {
          studentTransportFee: {
            include: {
              student: { select: { userId: true, name: true, admissionNo: true } },
              transportFee: { select: { id: true, name: true, amount: true, frequency: true } }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' }
      }),
      prisma.transportFeePayment.count({ where })]
      );

      return { payments, total, page, limit, totalPages: Math.ceil(total / limit) };
    }, CACHE_TTL);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching transport fee payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
});

export const POST = withSchoolAccess(async function POST(req) {
  try {
    const data = await req.json();
    const { studentTransportFeeId, amount, paymentMethod, transactionId, collectedById, receiptNumber, notes } = data;

    if (!studentTransportFeeId || amount === undefined || !paymentMethod) {
      return NextResponse.json({
        error: 'Missing required fields: studentTransportFeeId, amount, paymentMethod'
      }, { status: 400 });
    }

    // Verify student transport fee exists
    const studentFee = await prisma.studentTransportFee.findUnique({
      where: { id: studentTransportFeeId },
      include: { transportFee: { select: { schoolId: true } } }
    });
    if (!studentFee) {
      return NextResponse.json({ error: 'Student transport fee not found' }, { status: 404 });
    }
    const activeYear = await resolveActiveAcademicYear(studentFee.transportFee.schoolId, data.academicYearId || null);
    if (!activeYear) {
      return NextResponse.json({ error: 'No active academic year found for transport fee payment.' }, { status: 400 });
    }
    try {
      await assertOperationalStudentsForYear({
        schoolId: studentFee.transportFee.schoolId,
        academicYearId: activeYear.id,
        studentIds: [studentFee.studentId],
        moduleName: 'recording transport fee payment',
        requireJoiningDate: true,
      });
    } catch (error) {
      return NextResponse.json({
        error: error.message,
        code: error.code || 'OPERATIONAL_ENROLLMENT_REQUIRED',
        blockedStudentIds: error.blockedStudentIds || [],
      }, { status: 400 });
    }

    const payment = await prisma.transportFeePayment.create({
      data: {
        studentTransportFeeId,
        amount: parseFloat(amount),
        paymentDate: new Date(),
        paymentMethod,
        transactionId,
        status: 'PAID',
        collectedById,
        receiptNumber,
        notes
      },
      include: {
        studentTransportFee: {
          include: {
            student: { select: { name: true, admissionNo: true } },
            transportFee: { select: { name: true } }
          }
        }
      }
    });

    await invalidatePattern(`transport-fee-payments:*`);

    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (error) {
    console.error('Error recording transport fee payment:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
});
