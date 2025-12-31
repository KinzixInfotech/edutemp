import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Fetch single student details with all relations and aggregated stats
export async function GET(req, { params }) {
    try {
        const { studentId } = await params;

        if (!studentId) {
            return NextResponse.json({ error: "Student ID required" }, { status: 400 });
        }

        const student = await prisma.student.findUnique({
            where: { userId: studentId },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        profilePicture: true,
                        status: true
                    }
                },
                class: { select: { className: true, id: true } },
                section: { select: { name: true, id: true } },
                studentParentLinks: {
                    include: {
                        parent: {
                            include: {
                                user: { select: { name: true, email: true } }
                            }
                        }
                    }
                },
                // Include Fees
                studentFees: {
                    include: {
                        academicYear: true,
                        globalFeeStructure: true,
                        payments: true,
                        particulars: true,
                        installments: true
                    },
                    orderBy: { assignedDate: 'desc' }
                },
                // Include Exam Results
                examResults: {
                    include: {
                        exam: { select: { title: true, startDate: true, status: true } },
                        subject: { select: { subjectName: true } }
                    },
                    orderBy: { exam: { startDate: 'desc' } }
                },
                school: {
                    select: {
                        name: true,
                        profilePicture: true,
                        id: true
                    }
                }
            }
        });

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        // --- DYNAMIC STATS CALCULATION ---

        // Check if student has any fee structures assigned
        const hasFees = student.studentFees && student.studentFees.length > 0;

        // Calculate fee status only if fees exist
        let feeStatus = null;
        let totalFeeAmount = 0;
        let totalPaidAmount = 0;
        let totalBalanceAmount = 0;

        if (hasFees) {
            const unpaidFees = student.studentFees.filter(f => f.status !== 'PAID').length;
            feeStatus = unpaidFees === 0 ? "Paid" : "Pending";

            // Calculate totals
            student.studentFees.forEach(fee => {
                totalFeeAmount += fee.finalAmount || 0;
                totalPaidAmount += fee.paidAmount || 0;
                totalBalanceAmount += fee.balanceAmount || 0;
            });
        }

        // Attendance Percentage (Current Academic Year)
        const activeYear = await prisma.academicYear.findFirst({
            where: { schoolId: student.school.id, isActive: true }
        });

        let attendancePercentage = 0;
        let totalAttendanceDays = 0;
        let presentDays = 0;

        if (activeYear) {
            totalAttendanceDays = await prisma.attendance.count({
                where: {
                    userId: studentId,
                    date: { gte: activeYear.startDate, lte: activeYear.endDate }
                }
            });
            presentDays = await prisma.attendance.count({
                where: {
                    userId: studentId,
                    date: { gte: activeYear.startDate, lte: activeYear.endDate },
                    status: { in: ['PRESENT', 'LATE', 'HALF_DAY'] }
                }
            });
            attendancePercentage = totalAttendanceDays > 0 ? Math.round((presentDays / totalAttendanceDays) * 100) : 0;
        }

        // Performance from exam results
        const hasExams = student.examResults && student.examResults.length > 0;
        let performance = null;

        if (hasExams) {
            const lastResult = student.examResults[0];
            if (lastResult.grade) {
                performance = lastResult.grade;
            } else if (lastResult.marksObtained != null) {
                const marks = lastResult.marksObtained;
                if (marks >= 90) performance = "A+";
                else if (marks >= 80) performance = "A";
                else if (marks >= 70) performance = "B";
                else if (marks >= 60) performance = "C";
                else performance = "D";
            }
        }

        // Pending Tasks (Homework)
        let pendingTasks = 0;
        try {
            pendingTasks = await prisma.homework.count({
                where: {
                    classId: student.classId,
                    sectionId: student.sectionId,
                    dueDate: { gte: new Date() },
                    isActive: true,
                    submissions: {
                        none: { studentId: studentId }
                    }
                }
            });
        } catch (e) {
            // If HomeworkSubmission model doesn't exist, set to 0
            pendingTasks = 0;
        }

        // --- DATA FLATTENING FOR FRONTEND ---
        const father = student.studentParentLinks[0]?.parent;
        const mother = student.studentParentLinks[1]?.parent;

        const responseData = {
            ...student,
            // Flattened Parent Info
            FatherName: father?.user?.name || null,
            FatherNumber: father?.primaryPhone || null,
            MotherName: mother?.user?.name || null,
            MotherNumber: mother?.primaryPhone || null,

            // Flags for conditional rendering
            hasFees,
            hasExams,

            // Dynamic Stats
            stats: {
                feeStatus,
                totalFeeAmount,
                totalPaidAmount,
                totalBalanceAmount,
                attendance: attendancePercentage,
                totalAttendanceDays,
                presentDays,
                performance,
                pendingTasks
            }
        };

        return NextResponse.json(responseData);

    } catch (err) {
        console.error("Get Student Detail Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


// PATCH: Update student details
export async function PATCH(req, { params }) {
    try {
        const { studentId } = await params;
        const body = await req.json();

        // Destructure known fields
        const {
            name, email, // User model
            ...studentData // Student model
        } = body;

        // Transaction to update both
        const result = await prisma.$transaction(async (tx) => {
            // Update User if needed
            if (name || email) {
                await tx.user.update({
                    where: { id: studentId },
                    data: {
                        ...(name && { name }),
                        ...(email && { email }),
                    }
                });
            }

            // Update Student
            const updatedStudent = await tx.student.update({
                where: { userId: studentId },
                data: studentData
            });

            return updatedStudent;
        });

        return NextResponse.json(result);

    } catch (err) {
        console.error("Update Student Error:", err);
        return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
    }
}
