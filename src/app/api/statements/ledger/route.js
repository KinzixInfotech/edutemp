import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';

/**
 * Ledger Statement API
 * Fetches comprehensive fee data for "Fee Statement" PDF
 * GET /api/statements/ledger?studentId={id}&schoolId={id}
 */
export async function GET(request) {
    try {
        // Validate Student Session (Redis)
        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
        }

        const sessionData = await redis.get(`pay:session:${token}`);
        if (!sessionData) {
            return NextResponse.json({ error: 'Unauthorized: Session invalid' }, { status: 401 });
        }

        const session = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;

        // Check expiry
        if (new Date(session.expiresAt) < new Date()) {
            return NextResponse.json({ error: 'Unauthorized: Session expired' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');
        const schoolId = searchParams.get('schoolId');

        if (!studentId || !schoolId) {
            return NextResponse.json({ error: 'Missing studentId or schoolId' }, { status: 400 });
        }

        // Verify that the requested data belongs to the logged-in student
        if (session.studentId !== studentId || session.schoolId !== schoolId) {
            return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
        }

        // 1. Fetch Student Details
        const student = await prisma.student.findUnique({
            where: { userId: studentId },
            include: {
                user: true,
                class: true,
                section: true
            }
        });

        if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

        // 2. Fetch School Details
        const school = await prisma.school.findUnique({
            where: { id: schoolId }
        });

        // 3. Fetch Fee Structure & Installments Assigned to Student
        // (Assuming active fee assignment)
        const studentFee = await prisma.studentFee.findFirst({
            where: { studentId, },
            include: {
                globalFeeStructure: true,
                installments: {
                    orderBy: { dueDate: 'asc' }
                }
            }
        });

        if (!studentFee) return NextResponse.json({ error: 'No active fee structure found' }, { status: 404 });

        // 4. Fetch All Payments/Receipts
        const receipts = await prisma.receipt.findMany({
            where: { studentId, schoolId },
            orderBy: { createdAt: 'desc' },
            include: {
                feePayment: true
            }
        });

        // 5. Construct "Ledger Data" (Mode Adaptive)
        const mode = studentFee.globalFeeStructure.mode; // MONTHLY, QUARTERLY, etc.
        const installments = studentFee.installments;

        const ledgerRows = installments.map(inst => {
            // Find payments related to this installment
            // NOTE: In a real complex ledger, payments might be split. 
            // Here we assume simpler direct mapping or check total paid against installment amount.

            const isPaid = inst.status === 'PAID';
            const isPartial = inst.status === 'PARTIAL';

            // Format Descriptor based on Mode
            let descriptor = `Installment ${inst.installmentNumber}`;
            let subDescriptor = '';

            const date = new Date(inst.dueDate);
            const monthName = date.toLocaleString('default', { month: 'long' });
            const year = date.getFullYear();

            if (mode === 'MONTHLY' || mode === 'COMPOSITE_MONTHLY') {
                descriptor = `${monthName} ${year}`;
                subDescriptor = `Due: ${inst.dueDate.toLocaleDateString('en-IN')}`;
            } else if (mode === 'QUARTERLY') {
                descriptor = `Q${inst.installmentNumber} (${getQuarterPeriod(inst.dueDate)})`;
                subDescriptor = `${year}`;
            } else if (mode === 'HALF_YEARLY') {
                descriptor = `H${inst.installmentNumber}`;
                subDescriptor = year;
            } else if (mode === 'YEARLY') {
                descriptor = 'Annual Fee';
                subDescriptor = `${year}-${year + 1}`;
            }

            // Find receipt if paid (Approximate logic: find latest receipt that covered this installment date range or simplistic 1-1 check if exists)
            // For comprehensive ledger, we might need a relation Installment -> Payment. 
            // If not, we just show Paid status.

            // Calculating discount (if any)
            const due = inst.amount + (inst.lateFee || 0);
            const paid = inst.paidAmount;
            const discount = (due - paid > 0) && isPaid ? (due - paid) : 0; // Rough logic, or fetch actual discount from payment record if linked

            return {
                descriptor,
                subDescriptor,
                dueDate: new Date(inst.dueDate).toLocaleDateString('en-IN'),
                amount: inst.amount,
                paidDate: inst.paidDate ? new Date(inst.paidDate).toLocaleDateString('en-IN') : null,
                receiptNo: '—', // Would need payment relation to get exact receipt no per installment
                discount: 0, // Placeholder, populate if we track discount per installment
                status: isPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending'
            };
        });

        // 6. Summary Calculation
        const totalFee = installments.reduce((sum, i) => sum + i.amount + (i.lateFee || 0), 0);
        const totalPaid = installments.reduce((sum, i) => sum + i.paidAmount, 0);
        const balanceDue = totalFee - totalPaid;

        return NextResponse.json({
            schoolData: school,
            studentData: {
                studentName: student.user.name,
                admissionNo: student.admissionNo,
                className: student.class?.name,
                sectionName: student.section?.name,
                rollNo: student.rollNo,
                feeStructureName: studentFee.globalFeeStructure.name,
            },
            feeSummary: {
                totalFee,
                totalPaid,
                totalDiscount: 0, // Calculate if available
                balanceDue
            },
            ledgerData: ledgerRows,
            receiptsList: receipts.map(r => ({
                number: r.receiptNumber,
                date: new Date(r.createdAt).toLocaleDateString('en-IN'),
                amount: r.feePayment?.amount || 0,
                mode: r.feePayment?.paymentMethod || 'Online'
            }))
        });

    } catch (error) {
        console.error('Ledger error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Helper for quarters
function getQuarterPeriod(dateObj) {
    const d = new Date(dateObj);
    const month = d.getMonth(); // 0-11
    // Simple logic assuming standard quarters Jan-Mar, Apr-Jun, etc.
    // Adjust based on Academic Year start if needed.
    if (month >= 3 && month <= 5) return 'Apr-Jun';
    if (month >= 6 && month <= 8) return 'Jul-Sep';
    if (month >= 9 && month <= 11) return 'Oct-Dec';
    return 'Jan-Mar';
}
