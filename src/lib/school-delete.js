import prisma from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supbase-admin';
import { invalidatePattern } from '@/lib/cache';

export async function deleteSchoolCascade(schoolId) {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true, name: true },
    });

    if (!school) {
        throw new Error('School not found');
    }

    const schoolUsers = await prisma.user.findMany({
        where: { schoolId },
        select: { id: true },
    });
    const userIds = schoolUsers.map((user) => user.id);

    await prisma.$transaction(async (tx) => {
        await tx.biometricAttendanceEvent.deleteMany({ where: { schoolId } });
        await tx.temporaryMappingState.deleteMany({ where: { schoolId } });
        await tx.rfidIdentityMap.deleteMany({ where: { schoolId } });
        await tx.biometricIdentityMap.deleteMany({ where: { schoolId } });
        await tx.biometricDevice.deleteMany({ where: { schoolId } });

        await tx.attendanceNotification.deleteMany({ where: { schoolId } });
        await tx.attendanceLock.deleteMany({ where: { schoolId } });
        await tx.attendanceStats.deleteMany({ where: { schoolId } });
        await tx.bulkAttendance.deleteMany({ where: { schoolId } });
        await tx.attendance.deleteMany({ where: { schoolId } });
        await tx.attendanceDelegation.deleteMany({ where: { schoolId } });

        await tx.leaveRequest.deleteMany({ where: { schoolId } });
        await tx.leaveBalance.deleteMany({ where: { schoolId } });
        await tx.leaveBucket.deleteMany({ where: { schoolId } });

        await tx.hPCReport.deleteMany({ where: { schoolId } });
        await tx.hPCStageTemplate.deleteMany({ where: { schoolId } });
        await tx.sELParameter.deleteMany({ where: { schoolId } });
        await tx.activityCategory.deleteMany({ where: { schoolId } });

        await tx.storyStatus.deleteMany({ where: { schoolId } });
        await tx.status.deleteMany({ where: { schoolId } });

        await tx.profileChangeRequest.deleteMany({ where: { schoolId } });

        await tx.homework.deleteMany({ where: { schoolId } });
        await tx.assignment.deleteMany({ where: { schoolId } });

        await tx.timetableEntry.deleteMany({ where: { schoolId } });
        await tx.timetableTemplate.deleteMany({ where: { schoolId } });
        await tx.timeSlot.deleteMany({ where: { schoolId } });
        await tx.teacherShift.deleteMany({ where: { schoolId } });

        await tx.examHall.deleteMany({ where: { schoolId } });
        await tx.exam.deleteMany({ where: { schoolId } });

        await tx.admitCard.deleteMany({ where: { schoolId } });
        await tx.certificateGenerated.deleteMany({ where: { schoolId } });
        await tx.certificateTemplate.deleteMany({ where: { schoolId } });
        await tx.digitalIdCard.deleteMany({ where: { schoolId } });
        await tx.documentTemplate.deleteMany({ where: { schoolId } });
        await tx.signature.deleteMany({ where: { schoolId } });
        await tx.stamp.deleteMany({ where: { schoolId } });

        await tx.galleryAlbum.deleteMany({ where: { schoolId } });
        if (await tx.gallerySettings.findUnique({ where: { schoolId } })) {
            await tx.gallerySettings.delete({ where: { schoolId } });
        }

        await tx.notice.deleteMany({ where: { schoolId } });
        await tx.calendarEvent.deleteMany({ where: { schoolId } });
        await tx.schoolCalendar.deleteMany({ where: { schoolId } });
        await tx.termLock.deleteMany({ where: { schoolId } });

        await tx.libraryBookRequest.deleteMany({ where: { schoolId } });
        await tx.libraryBook.deleteMany({ where: { schoolId } });

        await tx.inventorySale.deleteMany({ where: { schoolId } });
        await tx.inventoryItem.deleteMany({ where: { schoolId } });
        await tx.inventoryCategory.deleteMany({ where: { schoolId } });

        await tx.receipt.deleteMany({ where: { schoolId } });
        await tx.feePayment.deleteMany({ where: { schoolId } });
        await tx.studentFee.deleteMany({ where: { schoolId } });
        await tx.studentFeeStructure.deleteMany({ where: { schoolId } });
        await tx.globalFeeStructure.deleteMany({ where: { schoolId } });
        await tx.feeStructure.deleteMany({ where: { schoolId } });

        if (await tx.feeSettings.findUnique({ where: { schoolId } })) {
            await tx.feeSettings.delete({ where: { schoolId } });
        }
        if (await tx.schoolPaymentSettings.findUnique({ where: { schoolId } })) {
            await tx.schoolPaymentSettings.delete({ where: { schoolId } });
        }

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

        await tx.payrollAuditLog.deleteMany({ where: { schoolId } });
        await tx.payrollPeriod.deleteMany({ where: { schoolId } });
        await tx.salaryStructure.deleteMany({ where: { schoolId } });
        if (await tx.payrollConfig.findUnique({ where: { schoolId } })) {
            await tx.payrollConfig.delete({ where: { schoolId } });
        }
        if (await tx.payrollSettings.findUnique({ where: { schoolId } })) {
            await tx.payrollSettings.delete({ where: { schoolId } });
        }

        await tx.syllabus.deleteMany({ where: { schoolId } });
        await tx.application.deleteMany({ where: { schoolId } });
        await tx.stage.deleteMany({ where: { schoolId } });
        await tx.form.deleteMany({ where: { schoolId } });

        await tx.upload.deleteMany({ where: { schoolId } });
        await tx.mediaLibrary.deleteMany({ where: { schoolId } });
        await tx.schoolCarouselImage.deleteMany({ where: { schoolId } });

        await tx.aiUsageLog.deleteMany({ where: { schoolId } });
        await tx.aiInsightCache.deleteMany({ where: { schoolId } });
        if (await tx.aiSettings.findUnique({ where: { schoolId } })) {
            await tx.aiSettings.delete({ where: { schoolId } });
        }

        await tx.importHistory.deleteMany({ where: { schoolId } });

        if (await tx.smsWallet.findUnique({ where: { schoolId } })) {
            await tx.smsWallet.delete({ where: { schoolId } });
        }

        if (await tx.qrVerificationSettings.findUnique({ where: { schoolId } })) {
            await tx.qrVerificationSettings.delete({ where: { schoolId } });
        }
        if (await tx.pdfExportSettings.findUnique({ where: { schoolId } })) {
            await tx.pdfExportSettings.delete({ where: { schoolId } });
        }

        if (await tx.attendanceConfig.findUnique({ where: { schoolId } })) {
            await tx.attendanceConfig.delete({ where: { schoolId } });
        }

        if (await tx.schoolSettings.findUnique({ where: { schoolId } })) {
            await tx.schoolSettings.delete({ where: { schoolId } });
        }

        await tx.partnerSchool.deleteMany({ where: { schoolId } });
        await tx.alumni.deleteMany({ where: { schoolId } });

        if (await tx.schoolPublicProfile.findUnique({ where: { schoolId } })) {
            await tx.schoolPublicProfile.delete({ where: { schoolId } });
        }

        if (await tx.schoolSubscription.findUnique({ where: { schoolId } })) {
            await tx.schoolSubscription.delete({ where: { schoolId } });
        }

        await tx.librarian.deleteMany({ where: { schoolId } });
        await tx.accountant.deleteMany({ where: { schoolId } });
        await tx.director.deleteMany({ where: { schoolId } });
        await tx.principal.deleteMany({ where: { schoolId } });

        await tx.studentParentLink.deleteMany({
            where: { parent: { schoolId } },
        });
        await tx.parent.deleteMany({ where: { schoolId } });
        await tx.student.deleteMany({ where: { schoolId } });
        await tx.teachingStaff.deleteMany({ where: { schoolId } });
        await tx.nonTeachingStaff.deleteMany({ where: { schoolId } });
        await tx.section.deleteMany({ where: { class: { schoolId } } });
        await tx.class.deleteMany({ where: { schoolId } });
        await tx.academicYear.deleteMany({ where: { schoolId } });
        await tx.admin.deleteMany({ where: { schoolId } });
        if (await tx.masterAdmin.findUnique({ where: { schoolId } })) {
            await tx.masterAdmin.delete({ where: { schoolId } });
        }
        await tx.employeePayrollProfile.deleteMany({ where: { schoolId } });
        await tx.user.deleteMany({ where: { schoolId } });
        await tx.school.delete({ where: { id: schoolId } });
    }, {
        timeout: 60000,
    });

    const deleteResults = { success: 0, failed: 0 };
    for (const userId of userIds) {
        try {
            await supabaseAdmin.auth.admin.deleteUser(userId);
            deleteResults.success++;
        } catch (error) {
            console.error(`Failed to delete Supabase user ${userId}:`, error);
            deleteResults.failed++;
        }
    }

    await invalidatePattern('schools:*');
    await invalidatePattern(`school:*:${schoolId}*`);

    return {
        school,
        deletedUsers: {
            total: userIds.length,
            supabaseDeleted: deleteResults.success,
            supabaseFailed: deleteResults.failed,
        },
    };
}
