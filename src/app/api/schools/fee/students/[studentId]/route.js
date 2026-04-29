import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateLateFees } from "@/lib/fee/late-fee-engine";
import { generateStudentLedger } from "@/lib/fee/ledger-engine";

// Map GlobalFeeParticular enums → FeeComponent enums (same as ledger route)
const TYPE_MAP = { MONTHLY: 'MONTHLY', ONE_TIME: 'ONE_TIME', ANNUAL: 'ANNUAL', TERM: 'TERM' };
const CATEGORY_MAP = { TUITION: 'FEE_TUITION', TRANSPORT: 'FEE_TRANSPORT', ACTIVITY: 'FEE_ACTIVITY', ADMISSION: 'FEE_ADMISSION', EXAMINATION: 'FEE_EXAMINATION', LIBRARY: 'FEE_LIBRARY', LABORATORY: 'FEE_LABORATORY', SPORTS: 'FEE_SPORTS', HOSTEL: 'FEE_HOSTEL', DEVELOPMENT: 'FEE_DEVELOPMENT', FINE: 'FEE_FINE', MISCELLANEOUS: 'FEE_MISCELLANEOUS' };
const CHARGE_MAP = { SESSION_START: 'CHARGE_SESSION_START', ON_ADMISSION: 'CHARGE_ON_ADMISSION', ON_PROMOTION: 'CHARGE_ON_PROMOTION', MONTHLY: 'CHARGE_MONTHLY' };

async function syncFeeComponents(feeStructureId, session) {
  if (!feeStructureId || !session) return 0;
  const existing = await prisma.feeComponent.count({ where: { feeStructureId, feeSessionId: session.id } });
  if (existing > 0) return existing;
  const particulars = await prisma.globalFeeParticular.findMany({ where: { globalFeeStructureId: feeStructureId }, orderBy: { displayOrder: 'asc' } });
  if (!particulars.length) return 0;
  await prisma.feeComponent.createMany({
    data: particulars.map((p, i) => ({
      feeStructureId, feeSessionId: session.id, name: p.name, amount: p.amount,
      type: TYPE_MAP[p.type] || 'MONTHLY', category: CATEGORY_MAP[p.category] || 'FEE_TUITION',
      chargeTiming: CHARGE_MAP[p.chargeTiming] || 'CHARGE_MONTHLY', serviceId: p.serviceId || null,
      lateFeeRuleId: p.lateFeeRuleId || null, isOptional: p.isOptional || false, isActive: true,
      applicableMonths: p.applicableMonths ? JSON.parse(p.applicableMonths) : null, displayOrder: p.displayOrder ?? i
    })),
    skipDuplicates: true
  });
  return particulars.length;
}

function formatCurrencyNumber(value) {
  return Number(Number(value || 0).toFixed(2));
}

function formatMonthKey(dateInput) {
  const date = new Date(dateInput);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function getLedgerStatusMeta(entry) {
  const isPaid = entry.status === 'LEDGER_PAID';
  const isWaived = entry.status === 'LEDGER_WAIVED';
  const isPartial = entry.status === 'LEDGER_PARTIAL';
  const isOverdue = !isPaid && !isWaived && new Date(entry.dueDate) < new Date();

  if (isWaived) {
    return { badge: 'Waived', tone: 'waived' };
  }
  if (isPaid) {
    return { badge: 'Paid', tone: 'paid' };
  }
  if (isOverdue) {
    return { badge: 'Overdue', tone: 'overdue' };
  }
  if (isPartial) {
    return { badge: 'Partially Paid', tone: 'partial' };
  }
  return { badge: 'Unpaid', tone: 'pending' };
}

function getCategoryHeading(type) {
  switch (type) {
    case 'ONE_TIME':
      return 'One-time Fees';
    case 'ANNUAL':
      return 'Annual Fees';
    case 'TERM':
      return 'Term Fees';
    default:
      return 'Monthly Fees';
  }
}

function buildLedgerMonths(ledgerEntries) {
  const monthMap = new Map();

  for (const entry of ledgerEntries) {
    const monthKey = formatMonthKey(entry.month);
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        monthKey,
        monthLabel: entry.monthLabel || formatMonthLabel(entry.month),
        monthDate: entry.month,
        totalOriginal: 0,
        totalDiscount: 0,
        totalLateFee: 0,
        totalNet: 0,
        totalPaid: 0,
        totalBalance: 0,
        overdueAmount: 0,
        groups: new Map()
      });
    }

    const month = monthMap.get(monthKey);
    month.totalOriginal += entry.originalAmount || 0;
    month.totalDiscount += entry.discountAmount || 0;
    month.totalLateFee += entry.lateFeeAmount || 0;
    month.totalNet += entry.netAmount || 0;
    month.totalPaid += entry.paidAmount || 0;
    month.totalBalance += entry.balanceAmount || 0;

    const statusMeta = getLedgerStatusMeta(entry);
    if (statusMeta.tone === 'overdue') {
      month.overdueAmount += entry.balanceAmount || 0;
    }

    const groupKey = entry.feeComponent?.type || 'MONTHLY';
    if (!month.groups.has(groupKey)) {
      month.groups.set(groupKey, {
        key: groupKey,
        title: getCategoryHeading(groupKey),
        items: []
      });
    }

    month.groups.get(groupKey).items.push({
      id: entry.id,
      title: entry.feeComponent?.name || 'Fee Item',
      dueDate: entry.dueDate,
      dueDateLabel: new Date(entry.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      originalAmount: formatCurrencyNumber(entry.originalAmount),
      discountAmount: formatCurrencyNumber(entry.discountAmount),
      lateFeeAmount: formatCurrencyNumber(entry.lateFeeAmount),
      netAmount: formatCurrencyNumber(entry.netAmount),
      paidAmount: formatCurrencyNumber(entry.paidAmount),
      balanceAmount: formatCurrencyNumber(entry.balanceAmount),
      status: entry.status,
      statusMeta,
      canAdjust: !entry.isFrozen && entry.status !== 'LEDGER_PAID',
      isOptional: !!entry.feeComponent?.isOptional
    });
  }

  return Array.from(monthMap.values()).
  sort((a, b) => new Date(a.monthDate) - new Date(b.monthDate)).
  map((month) => {
    const paidInMonth = month.totalPaid;
    const progress = month.totalNet > 0 ? Math.min(100, Math.round(paidInMonth / month.totalNet * 100)) : 0;
    const monthStatus = month.totalBalance <= 0 ?
    'No Dues' :
    month.overdueAmount > 0 ?
    'Overdue' :
    paidInMonth > 0 ?
    'Partially Paid' :
    'Upcoming';

    return {
      monthKey: month.monthKey,
      monthLabel: month.monthLabel,
      monthStatus,
      totalOriginal: formatCurrencyNumber(month.totalOriginal),
      totalDiscount: formatCurrencyNumber(month.totalDiscount),
      totalLateFee: formatCurrencyNumber(month.totalLateFee),
      totalNet: formatCurrencyNumber(month.totalNet),
      totalPaid: formatCurrencyNumber(month.totalPaid),
      totalBalance: formatCurrencyNumber(month.totalBalance),
      overdueAmount: formatCurrencyNumber(month.overdueAmount),
      progress,
      groups: Array.from(month.groups.values()),
      isEmpty: Array.from(month.groups.values()).every((group) => group.items.length === 0)
    };
  });
}

function buildStudentProfile(studentFee, studentDetails) {
  const student = studentDetails || studentFee?.student;
  if (!student) return null;

  const parentLinks = student.studentParentLinks || [];
  const fatherLink = parentLinks.find((link) => link.relation === 'FATHER');
  const motherLink = parentLinks.find((link) => link.relation === 'MOTHER');
  const guardianLink = parentLinks.find((link) =>
  ['GUARDIAN', 'GRANDFATHER', 'GRANDMOTHER', 'UNCLE', 'AUNT', 'OTHER'].includes(link.relation)
  );

  return {
    id: student.userId,
    name: student.name,
    admissionNo: student.admissionNo,
    rollNumber: student.rollNumber,
    profilePicture: student.user?.profilePicture || null,
    admissionDate: student.admissionDate,
    joinedOnLabel: student.admissionDate ?
    new Date(student.admissionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) :
    null,
    className: student.class?.className || null,
    sectionName: student.section?.name || null,
    fatherName: fatherLink?.parent?.name || fatherLink?.parent?.user?.name || student.FatherName || null,
    motherName: motherLink?.parent?.name || motherLink?.parent?.user?.name || student.MotherName || null,
    guardianName: guardianLink?.parent?.name || guardianLink?.parent?.user?.name || student.GuardianName || null,
    guardianRelation: guardianLink?.relation || student.GuardianRelation || null
  };
}

function buildInstallmentSummary(installments) {
  return (installments || []).map((installment) => {
    const paidAmount = formatCurrencyNumber(installment.paidAmount);
    const totalAmount = formatCurrencyNumber(installment.amount);
    const balanceAmount = formatCurrencyNumber(totalAmount - paidAmount);
    const monthDate = installment.dueDate || new Date();
    return {
      ...installment,
      monthLabel: formatMonthLabel(monthDate),
      dueDateLabel: installment.dueDate ?
      new Date(installment.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) :
      null,
      balanceAmount,
      progress: totalAmount > 0 ? Math.min(100, Math.round(paidAmount / totalAmount * 100)) : 0
    };
  });
}export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  try {
    const { studentId } = params;
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    let feeSessionId = searchParams.get("feeSessionId"); // 🟢 New Ledger Support

    if (!academicYearId) {
      return NextResponse.json({ error: "academicYearId required" }, { status: 400 });
    }

    // Auto-resolve feeSessionId from academicYearId when they match or session ID is invalid
    let resolvedSession = null;
    if (feeSessionId) {
      resolvedSession = await prisma.feeSession.findUnique({ where: { id: feeSessionId } });
    }

    if (!resolvedSession) {
      const student = await prisma.student.findUnique({
        where: { userId: studentId },
        select: { schoolId: true }
      });
      if (student) {
        resolvedSession = await prisma.feeSession.findFirst({
          where: { schoolId: student.schoolId, academicYearId, isActive: true }
        });
        feeSessionId = resolvedSession?.id || null;
      } else {
        feeSessionId = null;
      }
    }

    // Fetch student fee and settings in parallel
    const [studentFee, student] = await Promise.all([
    prisma.studentFee.findUnique({
      where: { studentId_academicYearId: { studentId, academicYearId } },
      include: {
        student: {
          select: {
            user: {
              select: { profilePicture: true, name: true, email: true }
            },
            userId: true, name: true, admissionNo: true, rollNumber: true, admissionDate: true,
            class: { select: { className: true } },
            section: { select: { name: true } },
            schoolId: true,
            studentParentLinks: {
              where: { isActive: true },
              include: {
                parent: {
                  select: {
                    name: true,
                    user: { select: { name: true } }
                  }
                }
              }
            },
            FatherName: true,
            MotherName: true,
            GuardianName: true,
            GuardianRelation: true
          }
        },
        globalFeeStructure: {
          select: {
            name: true, mode: true,
            installmentRules: { orderBy: { installmentNumber: 'asc' } }
          }
        },
        particulars: { orderBy: { name: "asc" } },
        installments: { orderBy: { installmentNumber: "asc" } },
        payments: { orderBy: { paymentDate: "desc" }, where: { status: "SUCCESS" } },
        discounts: { include: { approver: { select: { name: true } } } }
      }
    }),
    prisma.student.findUnique({
      where: { userId: studentId },
      select: { schoolId: true }
    })]
    );

    // Fetch payment settings for this school
    const schoolId = student?.schoolId || studentFee?.student?.schoolId;

    let feeSettings = null;
    let schoolPaymentSettings = null;
    if (schoolId) {
      feeSettings = await prisma.feeSettings.findUnique({
        where: { schoolId }
      });
      schoolPaymentSettings = await prisma.schoolPaymentSettings.findUnique({
        where: { schoolId },
        select: {
          provider: true
        }
      });
    }
    let sessionData = null;
    if (feeSessionId) {
      sessionData = await prisma.feeSession.findUnique({
        where: { id: feeSessionId }
      });
    }

    // Only generate missing ledger once. Do not regenerate on every read.
    let ledgerEntries = [];
    let walletBalance = 0;

    if (feeSessionId && studentFee?.globalFeeStructureId && resolvedSession) {
      try {
        // Sync FeeComponents from GlobalFeeParticular (no-op if already synced)
        await syncFeeComponents(studentFee.globalFeeStructureId, resolvedSession);
      } catch (regenErr) {
        console.error('[Ledger Component Sync] Non-fatal error:', regenErr.message);
      }

      const existingLedgerCount = await prisma.studentFeeLedger.count({
        where: { studentId, feeSessionId }
      });

      if (existingLedgerCount === 0) {
        try {
          await generateStudentLedger({
            studentId,
            schoolId: resolvedSession.schoolId,
            academicYearId: resolvedSession.academicYearId,
            feeSessionId: resolvedSession.id,
            feeStructureId: studentFee.globalFeeStructureId,
            joinDate: studentFee.student?.admissionDate || new Date(),
            userId: 'SYSTEM'
          });
        } catch (generateErr) {
          console.error('[Ledger Initial Generate] Non-fatal error:', generateErr.message);
        }
      }

      await calculateLateFees(studentId, feeSessionId, false);

      // Fetch fresh ledger entries
      ledgerEntries = await prisma.studentFeeLedger.findMany({
        where: { studentId, feeSessionId },
        include: {
          feeComponent: {
            select: { name: true, type: true, category: true, isOptional: true }
          }
        },
        orderBy: [
        { month: "asc" },
        { dueDate: "asc" },
        { feeComponent: { displayOrder: "asc" } }]

      });

      // Sync StudentFee totals from actual ledger data
      if (ledgerEntries.length > 0 && studentFee) {
        const totals = ledgerEntries.reduce((acc, e) => {
          acc.originalAmount += e.originalAmount || 0;
          acc.netAmount += e.netAmount || 0;
          acc.paidAmount += e.paidAmount || 0;
          acc.balanceAmount += e.balanceAmount || 0;
          return acc;
        }, { originalAmount: 0, netAmount: 0, paidAmount: 0, balanceAmount: 0 });

        // Update in DB and in-memory object so the response is always accurate
        if (totals.netAmount !== studentFee.finalAmount || totals.paidAmount !== studentFee.paidAmount) {
          await prisma.studentFee.update({
            where: { id: studentFee.id },
            data: {
              originalAmount: totals.netAmount,
              finalAmount: totals.netAmount,
              paidAmount: totals.paidAmount,
              balanceAmount: totals.balanceAmount
            }
          });
          studentFee.originalAmount = totals.netAmount;
          studentFee.finalAmount = totals.netAmount;
          studentFee.paidAmount = totals.paidAmount;
          studentFee.balanceAmount = totals.balanceAmount;
        }
      }

      const wallet = await prisma.studentWallet.findUnique({
        where: { studentId }
      });
      walletBalance = wallet?.balance || 0;
    } else if (feeSessionId) {
      // No fee structure assigned — just fetch existing entries
      await calculateLateFees(studentId, feeSessionId, false);
      ledgerEntries = await prisma.studentFeeLedger.findMany({
        where: { studentId, feeSessionId },
        include: {
          feeComponent: {
            select: { name: true, type: true, category: true, isOptional: true }
          }
        },
        orderBy: [
        { month: "asc" },
        { dueDate: "asc" },
        { feeComponent: { displayOrder: "asc" } }]

      });
      const wallet = await prisma.studentWallet.findUnique({ where: { studentId } });
      walletBalance = wallet?.balance || 0;
    }

    const studentProfile = buildStudentProfile(studentFee, studentFee?.student || null);
    const ledgerMonths = buildLedgerMonths(ledgerEntries);
    const totalExpectedCollection = ledgerEntries.reduce((sum, entry) => sum + (entry.netAmount || 0), 0);
    const totalCollected = ledgerEntries.reduce((sum, entry) => sum + (entry.paidAmount || 0), 0);
    const totalPending = ledgerEntries.reduce((sum, entry) => sum + (entry.balanceAmount || 0), 0);
    const totalDiscountGiven = ledgerEntries.reduce((sum, entry) => sum + (entry.discountAmount || 0), 0);
    const totalLateFee = ledgerEntries.reduce((sum, entry) => sum + (entry.lateFeeAmount || 0), 0);
    const collectionProgress = totalExpectedCollection > 0 ?
    Math.min(100, Math.round(totalCollected / totalExpectedCollection * 100)) :
    0;

    if (!studentFee) {
      // Fetch student details so the frontend can at least display the header
      const studentDetails = await prisma.student.findUnique({
        where: { userId: studentId },
        select: {
          userId: true,
          name: true,
          admissionNo: true,
          rollNumber: true,
          admissionDate: true,
          schoolId: true,
          FatherName: true,
          MotherName: true,
          GuardianName: true,
          GuardianRelation: true,
          user: { select: { profilePicture: true, name: true, email: true } },
          class: { select: { className: true } },
          section: { select: { name: true } },
          studentParentLinks: {
            where: { isActive: true },
            include: {
              parent: {
                select: {
                  name: true,
                  user: { select: { name: true } }
                }
              }
            }
          }
        }
      });

      return NextResponse.json({
        isUnassigned: !feeSessionId || ledgerEntries.length === 0, // V1 flag compatibility
        student: studentDetails,
        studentProfile: buildStudentProfile(null, studentDetails),
        session: sessionData, // 🟢 Inject Session Data
        originalAmount: 0,
        paidAmount: 0,
        balanceAmount: 0,
        installments: [],
        ledger: ledgerEntries, // 🟢 Inject Ledger Data
        ledgerMonths,
        walletBalance, // 🟢 Inject Wallet Data
        summary: {
          totalFeesCollected: 0,
          feesPendingAcrossYear: formatCurrencyNumber(totalPending),
          expectedCollection: formatCurrencyNumber(totalExpectedCollection),
          discountGiven: formatCurrencyNumber(totalDiscountGiven),
          lateFeeAccrued: formatCurrencyNumber(totalLateFee),
          collectionProgress
        },
        overdueCount: 0,
        nextDueInstallment: null,
        paymentOptions: {
          onlineEnabled: feeSettings?.onlinePaymentEnabled ?? false,
          gateway: schoolPaymentSettings?.provider ?? null,
          testMode: feeSettings?.sandboxMode ?? true,
          receiptSettings: {
            receiptPrefix: feeSettings?.receiptPrefix || 'REC',
            receiptPaperSize: feeSettings?.receiptPaperSize || 'a4',
            showSchoolLogo: feeSettings?.showSchoolLogo ?? true,
            showBalanceDue: feeSettings?.showBalanceDue ?? true,
            showPaymentMode: feeSettings?.showPaymentMode ?? true,
            showSignatureLine: feeSettings?.showSignatureLine ?? true,
            receiptFooterText: feeSettings?.receiptFooterText || null
          }
        }
      });
    }

    // Calculate installment breakdowns (V1 Legacy logic)
    const enrichedInstallments = buildInstallmentSummary(studentFee.installments.map((installment) => {
      const rule = studentFee.globalFeeStructure?.installmentRules?.find(
        (r) => r.installmentNumber === installment.installmentNumber
      );
      const percentage = rule ? rule.percentage : 100;

      return {
        ...installment,
        rule: rule || null,
        particularBreakdowns: studentFee.particulars.map((p) => ({
          particularId: p.id,
          particularName: p.name,
          totalParticularAmount: p.amount,
          amountInThisInstallment: p.amount * percentage / 100
        })),
        canPayNow: installment.status !== 'PAID' && installment.amount > installment.paidAmount
      };
    }));

    // Update overdue status
    const now = new Date();
    const overdueInstallments = enrichedInstallments.filter(
      (inst) => inst.status !== "PAID" && new Date(inst.dueDate) < now
    );

    if (overdueInstallments.length > 0) {
      await prisma.studentFeeInstallment.updateMany({
        where: { id: { in: overdueInstallments.map((i) => i.id) } },
        data: { isOverdue: true }
      });
    }

    return NextResponse.json({
      ...studentFee,
      studentProfile,
      session: sessionData, // 🟢 Inject Session Data
      installments: enrichedInstallments,
      ledger: ledgerEntries, // 🟢 Inject Ledger Data
      ledgerMonths,
      walletBalance, // 🟢 Inject Wallet Data
      summary: {
        totalFeesCollected: formatCurrencyNumber(totalCollected),
        feesPendingAcrossYear: formatCurrencyNumber(totalPending),
        expectedCollection: formatCurrencyNumber(totalExpectedCollection),
        discountGiven: formatCurrencyNumber(totalDiscountGiven),
        lateFeeAccrued: formatCurrencyNumber(totalLateFee),
        collectionProgress
      },
      overdueCount: overdueInstallments.length,
      nextDueInstallment: enrichedInstallments.find((inst) => inst.status === "PENDING" && !inst.isOverdue),
      // Payment options for mobile app
      paymentOptions: {
        onlineEnabled: feeSettings?.onlinePaymentEnabled ?? false,
        gateway: schoolPaymentSettings?.provider ?? null,
        testMode: feeSettings?.sandboxMode ?? true,
        receiptSettings: {
          receiptPrefix: feeSettings?.receiptPrefix || 'REC',
          receiptPaperSize: feeSettings?.receiptPaperSize || 'a4',
          showSchoolLogo: feeSettings?.showSchoolLogo ?? true,
          showBalanceDue: feeSettings?.showBalanceDue ?? true,
          showPaymentMode: feeSettings?.showPaymentMode ?? true,
          showSignatureLine: feeSettings?.showSignatureLine ?? true,
          receiptFooterText: feeSettings?.receiptFooterText || null
        }
      }
    });
  } catch (error) {
    console.error("Get Student Fee Error:", error);
    return NextResponse.json({ error: `Failed to fetch student fee details ${error}` }, { status: 500 });
  }
});