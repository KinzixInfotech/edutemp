import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supbase-admin"
import { invalidatePattern } from "@/lib/cache"

export async function DELETE(request, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        // Verify school exists
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, name: true },
        });

        if (!school) {
            return NextResponse.json({ error: "School not found" }, { status: 404 });
        }

        // Collect all user IDs linked to this school for Supabase cleanup
        const schoolUsers = await prisma.user.findMany({
            where: { schoolId },
            select: { id: true },
        });
        const userIds = schoolUsers.map(u => u.id);

        // Execute cascading delete in a transaction
        await prisma.$transaction(async (tx) => {
            // ─── Delete leaf-level / dependent records first ───

            // Biometric & RFID
            await tx.biometricAttendanceEvent.deleteMany({ where: { schoolId } });
            await tx.temporaryMappingState.deleteMany({ where: { schoolId } });
            await tx.rfidIdentityMap.deleteMany({ where: { schoolId } });
            await tx.biometricIdentityMap.deleteMany({ where: { schoolId } });
            await tx.biometricDevice.deleteMany({ where: { schoolId } });

            // Attendance system
            await tx.attendanceNotification.deleteMany({ where: { schoolId } });
            await tx.attendanceLock.deleteMany({ where: { schoolId } });
            await tx.attendanceStats.deleteMany({ where: { schoolId } });
            await tx.bulkAttendance.deleteMany({ where: { schoolId } });
            await tx.attendance.deleteMany({ where: { schoolId } });
            await tx.attendanceDelegation.deleteMany({ where: { schoolId } });

            // Leave system
            await tx.leaveRequest.deleteMany({ where: { schoolId } });
            await tx.leaveBalance.deleteMany({ where: { schoolId } });
            await tx.leaveBucket.deleteMany({ where: { schoolId } });

            // HPC / SEL / Activity
            await tx.hPCReport.deleteMany({ where: { schoolId } });
            await tx.hPCStageTemplate.deleteMany({ where: { schoolId } });
            await tx.sELParameter.deleteMany({ where: { schoolId } });
            await tx.activityCategory.deleteMany({ where: { schoolId } });

            // Status / Stories
            await tx.storyStatus.deleteMany({ where: { schoolId } });
            await tx.status.deleteMany({ where: { schoolId } });

            // Profile change requests
            await tx.profileChangeRequest.deleteMany({ where: { schoolId } });

            // Homework & Assignments
            await tx.homework.deleteMany({ where: { schoolId } });
            await tx.assignment.deleteMany({ where: { schoolId } });

            // Timetable & Time slots
            await tx.timetableEntry.deleteMany({ where: { schoolId } });
            await tx.timetableTemplate.deleteMany({ where: { schoolId } });
            await tx.timeSlot.deleteMany({ where: { schoolId } });
            await tx.teacherShift.deleteMany({ where: { schoolId } });

            // Exams
            await tx.examHall.deleteMany({ where: { schoolId } });
            await tx.exam.deleteMany({ where: { schoolId } });

            // Certificates & Documents
            await tx.admitCard.deleteMany({ where: { schoolId } });
            await tx.certificateGenerated.deleteMany({ where: { schoolId } });
            await tx.certificateTemplate.deleteMany({ where: { schoolId } });
            await tx.digitalIdCard.deleteMany({ where: { schoolId } });
            await tx.documentTemplate.deleteMany({ where: { schoolId } });
            await tx.signature.deleteMany({ where: { schoolId } });
            await tx.stamp.deleteMany({ where: { schoolId } });

            // Gallery
            await tx.galleryAlbum.deleteMany({ where: { schoolId } });
            if (await tx.gallerySettings.findUnique({ where: { schoolId } })) {
                await tx.gallerySettings.delete({ where: { schoolId } });
            }

            // Notices & Calendar
            await tx.notice.deleteMany({ where: { schoolId } });
            await tx.calendarEvent.deleteMany({ where: { schoolId } });
            await tx.schoolCalendar.deleteMany({ where: { schoolId } });
            await tx.termLock.deleteMany({ where: { schoolId } });

            // Library
            await tx.libraryBookRequest.deleteMany({ where: { schoolId } });
            await tx.libraryBook.deleteMany({ where: { schoolId } });

            // Inventory
            await tx.inventorySale.deleteMany({ where: { schoolId } });
            await tx.inventoryItem.deleteMany({ where: { schoolId } });
            await tx.inventoryCategory.deleteMany({ where: { schoolId } });

            // Fees & Payments
            await tx.receipt.deleteMany({ where: { schoolId } });
            await tx.feePayment.deleteMany({ where: { schoolId } });
            await tx.studentFee.deleteMany({ where: { schoolId } });
            await tx.studentFeeStructure.deleteMany({ where: { schoolId } });
            await tx.globalFeeStructure.deleteMany({ where: { schoolId } });
            await tx.feeStructure.deleteMany({ where: { schoolId } });

            // Fee settings
            if (await tx.feeSettings.findUnique({ where: { schoolId } })) {
                await tx.feeSettings.delete({ where: { schoolId } });
            }
            if (await tx.schoolPaymentSettings.findUnique({ where: { schoolId } })) {
                await tx.schoolPaymentSettings.delete({ where: { schoolId } });
            }

            // Transport
            await tx.busServiceSuspension.deleteMany({ where: { schoolId } });
            await tx.busRequest.deleteMany({ where: { schoolId } });
            await tx.routeAssignment.deleteMany({ where: { schoolId } });
            await tx.transportFee.deleteMany({ where: { schoolId } });
            await tx.route.deleteMany({ where: { schoolId } });
            await tx.vehicle.deleteMany({ where: { schoolId } });
            await tx.transportStaff.deleteMany({ where: { schoolId } });
            if (await tx.transportSettings.findUnique({ where: { schoolId } })) {
                await tx.transportSettings.delete({ where: { schoolId } });
            }

            // Payroll
            await tx.payrollAuditLog.deleteMany({ where: { schoolId } });
            await tx.payrollPeriod.deleteMany({ where: { schoolId } });
            await tx.salaryStructure.deleteMany({ where: { schoolId } });
            if (await tx.payrollConfig.findUnique({ where: { schoolId } })) {
                await tx.payrollConfig.delete({ where: { schoolId } });
            }
            if (await tx.payrollSettings.findUnique({ where: { schoolId } })) {
                await tx.payrollSettings.delete({ where: { schoolId } });
            }

            // Syllabus & Forms & Applications
            await tx.syllabus.deleteMany({ where: { schoolId } });
            await tx.application.deleteMany({ where: { schoolId } });
            await tx.stage.deleteMany({ where: { schoolId } });
            await tx.form.deleteMany({ where: { schoolId } });

            // Uploads & Media
            await tx.upload.deleteMany({ where: { schoolId } });
            await tx.mediaLibrary.deleteMany({ where: { schoolId } });
            await tx.schoolCarouselImage.deleteMany({ where: { schoolId } });

            // AI
            await tx.aiUsageLog.deleteMany({ where: { schoolId } });
            await tx.aiInsightCache.deleteMany({ where: { schoolId } });
            if (await tx.aiSettings.findUnique({ where: { schoolId } })) {
                await tx.aiSettings.delete({ where: { schoolId } });
            }

            // Import history
            await tx.importHistory.deleteMany({ where: { schoolId } });

            // SMS
            if (await tx.smsWallet.findUnique({ where: { schoolId } })) {
                await tx.smsWallet.delete({ where: { schoolId } });
            }

            // QR / PDF settings
            if (await tx.qrVerificationSettings.findUnique({ where: { schoolId } })) {
                await tx.qrVerificationSettings.delete({ where: { schoolId } });
            }
            if (await tx.pdfExportSettings.findUnique({ where: { schoolId } })) {
                await tx.pdfExportSettings.delete({ where: { schoolId } });
            }

            // Attendance config
            if (await tx.attendanceConfig.findUnique({ where: { schoolId } })) {
                await tx.attendanceConfig.delete({ where: { schoolId } });
            }

            // School settings
            if (await tx.schoolSettings.findUnique({ where: { schoolId } })) {
                await tx.schoolSettings.delete({ where: { schoolId } });
            }

            // Partner schools
            await tx.partnerSchool.deleteMany({ where: { schoolId } });

            // Alumni
            await tx.alumni.deleteMany({ where: { schoolId } });

            // Public profile
            if (await tx.schoolPublicProfile.findUnique({ where: { schoolId } })) {
                await tx.schoolPublicProfile.delete({ where: { schoolId } });
            }

            // Subscription
            if (await tx.schoolSubscription.findUnique({ where: { schoolId } })) {
                await tx.schoolSubscription.delete({ where: { schoolId } });
            }

            // ─── Delete role-based profiles ───
            await tx.librarian.deleteMany({ where: { schoolId } });
            await tx.accountant.deleteMany({ where: { schoolId } });
            await tx.director.deleteMany({ where: { schoolId } });
            await tx.principal.deleteMany({ where: { schoolId } });

            // Parents (delete student-parent links first)
            await tx.studentParentLink.deleteMany({
                where: { parent: { schoolId } },
            });
            await tx.parent.deleteMany({ where: { schoolId } });

            // Students
            await tx.student.deleteMany({ where: { schoolId } });

            // Staff
            await tx.teachingStaff.deleteMany({ where: { schoolId } });
            await tx.nonTeachingStaff.deleteMany({ where: { schoolId } });

            // Sections (belong to classes)
            await tx.section.deleteMany({ where: { class: { schoolId } } });
            await tx.class.deleteMany({ where: { schoolId } });

            // Academic years
            await tx.academicYear.deleteMany({ where: { schoolId } });

            // Admin + MasterAdmin
            await tx.admin.deleteMany({ where: { schoolId } });
            if (await tx.masterAdmin.findUnique({ where: { schoolId } })) {
                await tx.masterAdmin.delete({ where: { schoolId } });
            }

            // Payroll profiles for users
            await tx.employeePayrollProfile.deleteMany({ where: { schoolId } });

            // Users
            await tx.user.deleteMany({ where: { schoolId } });

            // Finally delete the school
            await tx.school.delete({ where: { id: schoolId } });
        }, {
            timeout: 60000, // 60 second timeout for large schools
        });

        // Delete Supabase auth users (outside transaction, best effort)
        const deleteResults = { success: 0, failed: 0 };
        for (const userId of userIds) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(userId);
                deleteResults.success++;
            } catch (err) {
                console.error(`Failed to delete Supabase user ${userId}:`, err);
                deleteResults.failed++;
            }
        }

        // Invalidate all caches
        await invalidatePattern('schools:*');
        await invalidatePattern(`school:*:${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: `School "${school.name}" and all associated data deleted successfully.`,
            deletedUsers: {
                total: userIds.length,
                supabaseDeleted: deleteResults.success,
                supabaseFailed: deleteResults.failed,
            },
        });
    } catch (err) {
        console.error("[SCHOOL_DELETE_CASCADE]", err);
        return NextResponse.json(
            { error: err.message || "Failed to delete school" },
            { status: 500 }
        );
    }
}
