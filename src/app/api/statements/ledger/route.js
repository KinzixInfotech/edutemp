import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import supabaseServer from '@/lib/supabase-server'; // Use singleton

/**
 * Ledger Statement API
 * Fetches comprehensive fee data for "Fee Statement" PDF
 * GET /api/statements/ledger?studentId={id}&schoolId={id}
 * 
 * Supports two authentication modes:
 * 1. Parent portal token (Redis pay:session)
 * 2. Admin dashboard token (Supabase JWT)
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');
        const schoolId = searchParams.get('schoolId');
        const period = searchParams.get('period') || 'full_year';
        const fromDate = searchParams.get('fromDate');
        const toDate = searchParams.get('toDate');

        if (!studentId || !schoolId) {
            return NextResponse.json({ error: 'Missing studentId or schoolId' }, { status: 400 });
        }

        // Get the token from Authorization header
        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
        }

        let isAuthorized = false;

        // Method 1: Try parent portal Redis session
        const sessionData = await redis.get(`pay:session:${token}`);
        if (sessionData) {
            const session = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;

            // Check expiry
            if (new Date(session.expiresAt) >= new Date()) {
                // Verify that the requested data belongs to the logged-in student
                if (session.studentId === studentId && session.schoolId === schoolId) {
                    isAuthorized = true;
                }
            }
        }

        // Method 2: Try Supabase JWT (admin dashboard)
        if (!isAuthorized) {
            try {
                const { data: { user }, error } = await supabaseServer.auth.getUser(token);

                if (!error && user) {
                    // Verify the user has access to this school
                    const adminUser = await prisma.user.findUnique({
                        where: { id: user.id },
                        select: { schoolId: true, role: true }
                    });
                    if (adminUser && adminUser.schoolId === schoolId &&
                        ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'ACCOUNTANT'].includes(adminUser.role.name)) {
                        isAuthorized = true;
                    }
                }
            } catch (supabaseError) {
                // Supabase token verification failed, continue
                console.log('Supabase auth failed:', supabaseError.message);
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized: Session invalid' }, { status: 401 });
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
        const mode = studentFee.globalFeeStructure.mode;
        const installments = studentFee.installments;

        const ledgerRows = installments.map(inst => {
            const isPaid = inst.status === 'PAID';
            const isPartial = inst.status === 'PARTIAL';

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

            const due = inst.amount + (inst.lateFee || 0);
            const paid = inst.paidAmount;

            return {
                descriptor,
                subDescriptor,
                dueDate: new Date(inst.dueDate).toLocaleDateString('en-IN'),
                rawDueDate: new Date(inst.dueDate),
                amount: inst.amount,
                paidDate: inst.paidDate ? new Date(inst.paidDate).toLocaleDateString('en-IN') : null,
                receiptNo: '—',
                discount: 0,
                status: isPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending'
            };
        });

        // Filter ledger rows by period
        const today = new Date();
        today.setHours(23, 59, 59, 999); // end of today
        let filteredRows = ledgerRows;
        if (period === 'till_date') {
            filteredRows = ledgerRows.filter(row => row.rawDueDate <= today);
        } else if (period === 'custom' && fromDate && toDate) {
            const from = new Date(fromDate);
            from.setHours(0, 0, 0, 0);
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            filteredRows = ledgerRows.filter(row => row.rawDueDate >= from && row.rawDueDate <= to);
        }
        // Remove rawDueDate before sending response
        filteredRows = filteredRows.map(({ rawDueDate, ...rest }) => rest);

        // 6. Summary Calculation (based on filtered rows)
        const totalFee = filteredRows.reduce((sum, r) => sum + r.amount, 0);
        const totalPaid = installments
            .filter(inst => {
                const d = new Date(inst.dueDate);
                if (period === 'till_date') return d <= today;
                if (period === 'custom' && fromDate && toDate) {
                    const from = new Date(fromDate);
                    from.setHours(0, 0, 0, 0);
                    const to = new Date(toDate);
                    to.setHours(23, 59, 59, 999);
                    return d >= from && d <= to;
                }
                return true;
            })
            .reduce((sum, i) => sum + i.paidAmount, 0);
        const balanceDue = totalFee - totalPaid;

        return NextResponse.json({
            schoolData: school,
            studentData: {
                studentName: student?.name,
                admissionNo: student.admissionNo,
                className: student.class?.className || student.class?.name,
                sectionName: student.section?.name,
                rollNo: student.rollNumber || student.rollNo,
                feeStructureName: studentFee.globalFeeStructure.name,
            },
            feeSummary: {
                totalFee,
                totalPaid,
                totalDiscount: 0,
                balanceDue
            },
            ledgerData: filteredRows,
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
    const month = d.getMonth();
    if (month >= 3 && month <= 5) return 'Apr-Jun';
    if (month >= 6 && month <= 8) return 'Jul-Sep';
    if (month >= 9 && month <= 11) return 'Oct-Dec';
    return 'Jan-Mar';
}
