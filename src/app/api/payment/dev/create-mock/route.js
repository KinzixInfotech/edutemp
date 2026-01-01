import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { useAuth } from "@/context/AuthContext"; // Cannot use hooks in API routes

export async function POST(req) {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: "Only available in development mode" }, { status: 403 });
    }

    try {
        const body = await req.json();
        // We'll need a schoolId to find a student. 
        // Ideally pass it from the frontend via auth context or body.
        const { schoolId, amount } = body;

        if (!schoolId) {
            return NextResponse.json({ error: "School ID required" }, { status: 400 });
        }

        // 1. Find a random student in this school
        const student = await prisma.student.findFirst({
            where: { schoolId },
            include: { AcademicYear: true } // Need academic year
        });

        if (!student) {
            return NextResponse.json({ error: "No students found in this school to attach payment to." }, { status: 404 });
        }

        // 2. Create a Mock Fee Structure (optional, or reuse existing)
        // Actually, we need a StudentFee record to link the payment to.
        // Let's create a dummy "Test Fee"
        const fee = await prisma.studentFee.create({
            data: {
                studentId: student.id,
                schoolId: schoolId,
                academicYearId: student.academicYearId || student.AcademicYear?.id, // Fallback
                feeStructureId: null, // Ad-hoc fee
                title: "Dev Test Fee",
                amount: parseFloat(amount || 100),
                dueAmount: parseFloat(amount || 100),
                paidAmount: 0,
                dueDate: new Date(),
                status: "PENDING"
            }
        });

        // 3. Create Pending FeePayment
        const orderId = `DEV_ORD_${Date.now()}`;
        const payment = await prisma.feePayment.create({
            data: {
                studentFeeId: fee.id,
                studentId: student.id,
                schoolId: schoolId,
                academicYearId: fee.academicYearId,
                amount: parseFloat(amount || 100),
                paymentMode: "ONLINE",
                paymentMethod: "ONLINE",
                status: "PENDING",
                gatewayName: "DEV_SIMULATOR",
                gatewayOrderId: orderId,
                receiptNumber: orderId // Temporary
            }
        });

        return NextResponse.json({
            success: true,
            orderId,
            message: `Created pending payment for student: ${student.firstName}`
        });

    } catch (error) {
        console.error("Mock creation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
