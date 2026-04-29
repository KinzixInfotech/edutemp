import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { delCache, generateKey } from "@/lib/cache";

/**
 * POST /api/schools/[schoolId]/academic-years/start-session
 * 
 * Full "Start New Academic Session" wizard endpoint.
 * Creates new year, archives old, clones configs, promotes students.
 */export const POST = withSchoolAccess(async function POST(req, { params }) {
  try {
    const { schoolId } = await params;
    const body = await req.json();
    const {
      name: requestedName,
      startDate,
      endDate,
      carryForward = {},
      promotionMode = "skip", // "auto" | "manual" | "skip"
      promotionMap = null, // For manual mode: [{studentId, toClassId}]
      promotionOverrides = {}, // Admin overrides: { classId: 'alumni' | 'skip' | { targetClassId } }
      promotedBy, // userId of admin performing the action
      existingYearId = null // Use existing future year instead of creating new
    } = body;

    // ─── Validations ─────────────────────────────────────
    let newYear;
    let sessionName = requestedName;
    let start;
    let end;

    if (existingYearId) {
      // Use an existing future year
      const existingYear = await prisma.academicYear.findUnique({
        where: { id: existingYearId }
      });

      if (!existingYear || existingYear.schoolId !== schoolId) {
        return NextResponse.json(
          { error: "Selected academic year not found" },
          { status: 404 }
        );
      }

      if (existingYear.isActive) {
        return NextResponse.json(
          { error: "Selected year is already active" },
          { status: 400 }
        );
      }

      // Get the current active year (source for cloning)
      const currentYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true }
      });

      // Activate existing year & archive old
      newYear = await prisma.$transaction(async (tx) => {
        if (currentYear) {
          await tx.academicYear.update({
            where: { id: currentYear.id },
            data: { isActive: false }
          });
        }
        return tx.academicYear.update({
          where: { id: existingYearId },
          data: { isActive: true, setupComplete: false }
        });
      });

      // Set variables for downstream cloning
      start = new Date(existingYear.startDate);
      end = new Date(existingYear.endDate);
      sessionName = existingYear.name;
    } else {
      // Create a brand new year
      if (!requestedName || !startDate || !endDate) {
        return NextResponse.json(
          { error: "Name, startDate, and endDate are required" },
          { status: 400 }
        );
      }

      start = new Date(startDate);
      end = new Date(endDate);

      if (end <= start) {
        return NextResponse.json(
          { error: "End date must be after start date" },
          { status: 400 }
        );
      }

      // Check for overlapping sessions
      const overlapping = await prisma.academicYear.findFirst({
        where: {
          schoolId,
          OR: [
          { startDate: { lte: end }, endDate: { gte: start } }]

        }
      });

      if (overlapping) {
        // If the overlapping year is inactive and matches the entered data,
        // auto-use it instead of blocking (user likely meant to select it)
        if (!overlapping.isActive) {
          // Switch to "use existing year" flow
          const currentYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true }
          });

          newYear = await prisma.$transaction(async (tx) => {
            if (currentYear) {
              await tx.academicYear.update({
                where: { id: currentYear.id },
                data: { isActive: false }
              });
            }
            return tx.academicYear.update({
              where: { id: overlapping.id },
              data: { isActive: true, setupComplete: false }
            });
          });

          start = new Date(overlapping.startDate);
          end = new Date(overlapping.endDate);
          sessionName = overlapping.name;
        } else {
          return NextResponse.json(
            { error: `Cannot create session — the active session "${overlapping.name}" (${new Date(overlapping.startDate).toLocaleDateString()} - ${new Date(overlapping.endDate).toLocaleDateString()}) overlaps with these dates. Use the "Start New Session" wizard to transition properly.` },
            { status: 400 }
          );
        }
      }
      // Only create a new year if the overlap check didn't auto-resolve
      if (!newYear) {
        // Get the current active year (source for cloning)
        const currentYear = await prisma.academicYear.findFirst({
          where: { schoolId, isActive: true }
        });

        // ─── Step 1: Create new year & archive old ───────────
        newYear = await prisma.$transaction(async (tx) => {
          // Archive old year
          if (currentYear) {
            await tx.academicYear.update({
              where: { id: currentYear.id },
              data: { isActive: false }
            });
          }

          // Create new year
          return tx.academicYear.create({
            data: {
              name: sessionName,
              startDate: start,
              endDate: end,
              schoolId,
              isActive: true,
              setupComplete: false
            }
          });
        });
      }
    }
    // Get the current year (now archived) for cloning
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: false },
      orderBy: { endDate: 'desc' }
    });

    console.log("[WIZARD DEBUG] newYear:", newYear?.id, newYear?.name);
    console.log("[WIZARD DEBUG] currentYear (source for cloning):", currentYear?.id, currentYear?.name);
    console.log("[WIZARD DEBUG] carryForward:", JSON.stringify(carryForward));

    const result = {
      newYearId: newYear.id,
      newYearName: newYear.name,
      archivedYearId: currentYear?.id,
      archivedYearName: currentYear?.name,
      cloned: {},
      promotion: {}
    };

    // If no source year to clone from, just return the new year
    if (!currentYear) {
      console.log("[WIZARD DEBUG] No currentYear found! Returning early.");
      await prisma.academicYear.update({
        where: { id: newYear.id },
        data: { setupComplete: true }
      });
      result.cloned = { message: "No previous session to clone from" };
      // Clear cache
      const cacheKey = generateKey('academic-years', { schoolId });
      await delCache(cacheKey);
      return NextResponse.json(result);
    }

    const fromYearId = currentYear.id;
    const toYearId = newYear.id;
    console.log("[WIZARD DEBUG] fromYearId:", fromYearId, "toYearId:", toYearId);

    // ─── Step 2: Clone Classes & Sections ────────────────
    if (carryForward.classesAndSections !== false) {
      try {
        // Try to find classes by academic year first, fallback to schoolId for legacy data
        let sourceClasses = await prisma.class.findMany({
          where: { academicYearId: fromYearId },
          include: { sections: true }
        });
        console.log("[WIZARD DEBUG] Classes with academicYearId=fromYear:", sourceClasses.length);

        // Fallback: if no classes bound to this year, get all school classes
        if (sourceClasses.length === 0) {
          sourceClasses = await prisma.class.findMany({
            where: { schoolId, academicYearId: null },
            include: { sections: true }
          });
          console.log("[WIZARD DEBUG] Fallback classes (NULL academicYearId):", sourceClasses.length);
        }

        if (sourceClasses.length === 0) {
          // Last resort: get ALL classes for this school regardless of academicYearId
          sourceClasses = await prisma.class.findMany({
            where: { schoolId },
            include: { sections: true }
          });
          console.log("[WIZARD DEBUG] Last resort ALL school classes:", sourceClasses.length);
          // Filter out any classes already bound to the target year
          sourceClasses = sourceClasses.filter((c) => c.academicYearId !== toYearId);
          console.log("[WIZARD DEBUG] After filtering out target year classes:", sourceClasses.length);
        }

        let classCount = 0;
        const classIdMap = new Map(); // oldClassId -> newClassId

        // Pre-fetch existing classes in target year to avoid duplicates
        const existingTargetClasses = await prisma.class.findMany({
          where: { academicYearId: toYearId, schoolId },
          include: { sections: true }
        });
        const existingByName = new Map();
        existingTargetClasses.forEach((c) => existingByName.set(c.className, c));
        console.log("[WIZARD DEBUG] Existing classes in target year:", existingTargetClasses.length);

        for (const cls of sourceClasses) {
          // Check if this class already exists in target year
          const existing = existingByName.get(cls.className);
          if (existing) {
            console.log(`[WIZARD DEBUG] Class "${cls.className}" already exists in target year, reusing id=${existing.id}`);
            classIdMap.set(cls.id, existing.id);

            // Still create any missing sections
            if (cls.sections?.length > 0) {
              const existingSectionNames = new Set(existing.sections.map((s) => s.name));
              const missingSections = cls.sections.filter((s) => !existingSectionNames.has(s.name));
              if (missingSections.length > 0) {
                await prisma.section.createMany({
                  data: missingSections.map((sec) => ({
                    name: sec.name,
                    classId: existing.id,
                    schoolId
                  }))
                });
                console.log(`[WIZARD DEBUG] Added ${missingSections.length} missing sections to existing class "${cls.className}"`);
              }
            }
            classCount++;
            continue;
          }

          const newClass = await prisma.class.create({
            data: {
              className: cls.className,
              academicYearId: toYearId,
              schoolId
            }
          });
          classIdMap.set(cls.id, newClass.id);

          if (cls.sections?.length > 0) {
            await prisma.section.createMany({
              data: cls.sections.map((sec) => ({
                name: sec.name,
                classId: newClass.id,
                schoolId
              }))
            });
          }
          classCount++;
        }

        await prisma.academicYear.update({
          where: { id: toYearId },
          data: { classesConfigured: true }
        });

        result.cloned.classes = classCount;
        result.cloned.classIdMap = Object.fromEntries(classIdMap);

        // ─── Step 2b: Clone Subject Mappings ─────────
        if (carryForward.subjectMappings !== false) {
          // Use same fallback logic for subject source classes
          let sourceClasses2 = await prisma.class.findMany({
            where: { academicYearId: fromYearId, schoolId }
          });
          if (sourceClasses2.length === 0) {
            sourceClasses2 = await prisma.class.findMany({
              where: { schoolId, academicYearId: null }
            });
          }
          if (sourceClasses2.length === 0) {
            // Last resort: ALL school classes except target year
            sourceClasses2 = await prisma.class.findMany({ where: { schoolId } });
            sourceClasses2 = sourceClasses2.filter((c) => c.academicYearId !== toYearId);
            console.log("[WIZARD DEBUG] Subject clone last resort classes:", sourceClasses2.length);
          }
          const targetClasses2 = await prisma.class.findMany({
            where: { academicYearId: toYearId, schoolId }
          });
          const targetClassMap = new Map();
          targetClasses2.forEach((c) => targetClassMap.set(c.className, c.id));

          const sourceSubjects = await prisma.subject.findMany({
            where: { classId: { in: sourceClasses2.map((c) => c.id) } }
          });

          let subjectCount = 0;
          for (const sub of sourceSubjects) {
            const sourceClass = sourceClasses2.find((c) => c.id === sub.classId);
            const targetClassId = targetClassMap.get(sourceClass?.className);
            if (!targetClassId) continue;

            const exists = await prisma.subject.findFirst({
              where: { classId: targetClassId, subjectName: sub.subjectName }
            });
            if (exists) continue;

            await prisma.subject.create({
              data: {
                subjectName: sub.subjectName,
                subjectCode: sub.subjectCode,
                classId: targetClassId,
                departmentId: sub.departmentId
              }
            });
            subjectCount++;
          }

          await prisma.academicYear.update({
            where: { id: toYearId },
            data: { subjectsConfigured: true }
          });

          result.cloned.subjects = subjectCount;
        }

        // ─── Step 2c: Clone Fee Structures ───────────
        if (carryForward.feeStructure !== false) {
          const targetClasses3 = await prisma.class.findMany({
            where: { academicYearId: toYearId, schoolId }
          });
          const sourceClasses3 = await prisma.class.findMany({
            where: { academicYearId: fromYearId, schoolId }
          });
          const targetClassMap3 = new Map();
          targetClasses3.forEach((c) => targetClassMap3.set(c.className, c.id));

          const sourceFees = await prisma.globalFeeStructure.findMany({
            where: { academicYearId: fromYearId, schoolId, status: 'ACTIVE' },
            include: { particulars: true, installmentRules: true }
          });

          const timeDiff = start.getTime() - new Date(currentYear.startDate).getTime();
          let feeCount = 0;

          for (const fee of sourceFees) {
            const sourceClass = sourceClasses3.find((c) => c.id === fee.classId);
            const targetClassId = targetClassMap3.get(sourceClass?.className);
            if (!targetClassId) continue;

            try {
              await prisma.globalFeeStructure.create({
                data: {
                  schoolId,
                  academicYearId: toYearId,
                  classId: targetClassId,
                  name: fee.name,
                  description: fee.description,
                  mode: fee.mode,
                  totalAmount: fee.totalAmount,
                  isActive: true,
                  status: "ACTIVE",
                  version: 1,
                  clonedFromId: fee.id,
                  enableInstallments: fee.enableInstallments,
                  particulars: {
                    create: fee.particulars.map((p) => ({
                      name: p.name,
                      amount: p.amount,
                      isOptional: p.isOptional,
                      category: p.category,
                      displayOrder: p.displayOrder,
                      type: p.type || 'MONTHLY',
                      chargeTiming: p.chargeTiming || 'SESSION_START',
                      serviceId: p.serviceId || null,
                      lateFeeRuleId: p.lateFeeRuleId || null,
                      applicableMonths: p.applicableMonths || null
                    }))
                  },
                  installmentRules: {
                    create: fee.installmentRules.map((r) => ({
                      installmentNumber: r.installmentNumber,
                      dueDate: new Date(new Date(r.dueDate).getTime() + timeDiff),
                      percentage: r.percentage,
                      amount: r.amount,
                      lateFeeAmount: r.lateFeeAmount,
                      lateFeeAfterDays: r.lateFeeAfterDays
                    }))
                  }
                }
              });
              feeCount++;
            } catch (err) {
              console.error(`Failed to clone fee ${fee.name}:`, err.message);
            }
          }

          await prisma.academicYear.update({
            where: { id: toYearId },
            data: { feesConfigured: true }
          });

          result.cloned.feeStructures = feeCount;
        }

        // ─── Step 3: Promote Students (using StudentSession) ─
        if (promotionMode === "auto") {
          // Smart grade ordering (same as GET preview)
          const GRADE_ORDER = [
          'PLAYGROUP', 'PLAY GROUP', 'PG',
          'NURSERY', 'NUR',
          'PREP', 'KG', 'KINDERGARTEN',
          'LKG', 'LOWER KG',
          'UKG', 'UPPER KG',
          '1', 'I', 'CLASS 1', 'CLASS-1',
          '2', 'II', 'CLASS 2', 'CLASS-2',
          '3', 'III', 'CLASS 3', 'CLASS-3',
          '4', 'IV', 'CLASS 4', 'CLASS-4',
          '5', 'V', 'CLASS 5', 'CLASS-5',
          '6', 'VI', 'CLASS 6', 'CLASS-6',
          '7', 'VII', 'CLASS 7', 'CLASS-7',
          '8', 'VIII', 'CLASS 8', 'CLASS-8',
          '9', 'IX', 'CLASS 9', 'CLASS-9',
          '10', 'X', 'CLASS 10', 'CLASS-10',
          '11', 'XI', 'CLASS 11', 'CLASS-11',
          '12', 'XII', 'CLASS 12', 'CLASS-12'];

          function getGradeIdx(className) {
            const n = className.trim().toUpperCase();
            const idx = GRADE_ORDER.indexOf(n);
            if (idx !== -1) return idx;
            for (let i = 0; i < GRADE_ORDER.length; i++) {
              if (n.includes(GRADE_ORDER[i]) || GRADE_ORDER[i].includes(n)) return i;
            }
            return 999;
          }

          // Fetch source classes (with fallback for legacy NULL academicYearId)
          let sourceClasses4 = await prisma.class.findMany({
            where: { academicYearId: fromYearId, schoolId }
          });
          if (sourceClasses4.length === 0) {
            sourceClasses4 = await prisma.class.findMany({
              where: { schoolId, academicYearId: null }
            });
          }
          if (sourceClasses4.length === 0) {
            // Last resort: ALL school classes except target year
            sourceClasses4 = await prisma.class.findMany({ where: { schoolId } });
            sourceClasses4 = sourceClasses4.filter((c) => c.academicYearId !== toYearId);
            console.log("[WIZARD DEBUG] Promotion source last resort classes:", sourceClasses4.length);
          }
          // Sort by grade level
          sourceClasses4.sort((a, b) => getGradeIdx(a.className) - getGradeIdx(b.className));

          const targetClasses4 = await prisma.class.findMany({
            where: { academicYearId: toYearId, schoolId }
          });
          targetClasses4.sort((a, b) => getGradeIdx(a.className) - getGradeIdx(b.className));

          const targetClassByName = new Map();
          targetClasses4.forEach((c) => targetClassByName.set(c.className, c.id));
          const targetClassById = new Map();
          targetClasses4.forEach((c) => targetClassById.set(c.id, c));

          // Build promotion map: sourceClassId → targetClassId (or 'alumni' or 'skip')
          const promotionMapping = new Map();
          const overrides = promotionOverrides || {};

          for (let i = 0; i < sourceClasses4.length; i++) {
            const src = sourceClasses4[i];
            const overrideVal = overrides[src.id];

            if (overrideVal === 'alumni') {
              promotionMapping.set(src.id, 'alumni');
            } else if (overrideVal === 'skip') {
              promotionMapping.set(src.id, 'skip');
            } else if (overrideVal && overrideVal.targetClassId) {
              // Admin override to specific class
              promotionMapping.set(src.id, overrideVal.targetClassId);
            } else {
              // Default: next class in grade order by matching className in target year
              const nextSrc = sourceClasses4[i + 1];
              const nextClassName = nextSrc?.className;
              const nextTargetId = nextClassName ? targetClassByName.get(nextClassName) : null;
              promotionMapping.set(src.id, nextTargetId || 'alumni');
            }
          }

          // Build section override map: sourceSectionId → targetSectionId
          // Supports per-section mapping (e.g. Section B → Section A)
          const sectionOverrideMap = new Map();
          for (const [srcClassId, overrideVal] of Object.entries(overrides)) {
            if (overrideVal?.sectionMap) {
              // New format: { sectionMap: { [sourceSectionId]: targetSectionId } }
              for (const [srcSecId, targetSecId] of Object.entries(overrideVal.sectionMap)) {
                sectionOverrideMap.set(parseInt(srcSecId), targetSecId);
              }
            } else if (overrideVal?.targetSectionId) {


              // Legacy format: class-level targetSectionId (keep backward compat)
              // We'd need all sections of this class - handled below via classId fallback
            }}console.log("[WIZARD DEBUG] Section overrides (per-section):", Object.fromEntries(sectionOverrideMap));

          // Get target sections
          const newSections = await prisma.section.findMany({
            where: { classId: { in: targetClasses4.map((c) => c.id) } }
          });

          // Get students (with fallback for legacy)
          let students = await prisma.student.findMany({
            where: { schoolId, academicYearId: fromYearId },
            include: { class: true, section: true }
          });
          if (students.length === 0) {
            students = await prisma.student.findMany({
              where: { schoolId, academicYearId: null },
              include: { class: true, section: true }
            });
          }
          if (students.length === 0) {
            // Last resort: get ALL non-alumni students for this school
            students = await prisma.student.findMany({
              where: { schoolId, isAlumni: { not: true } },
              include: { class: true, section: true }
            });
            console.log("[WIZARD DEBUG] Student last resort count:", students.length);
          }
          console.log("[WIZARD DEBUG] Students to promote:", students.length);

          let promoted = 0;
          let alumni = 0;
          let skipped = 0;
          const batchId = require("crypto").randomUUID();

          // Process promotions inside a transaction for safety
          await prisma.$transaction(async (tx) => {
            for (const student of students) {
              if (!student.classId) continue;

              const action = promotionMapping.get(student.classId);

              // Skip: leave student untouched
              if (action === 'skip') {
                skipped++;
                continue;
              }

              const isAlumni = action === 'alumni';
              const nextClassId = isAlumni ? null : action;

              // 1. Deactivate current session
              await tx.studentSession.updateMany({
                where: { studentId: student.userId, status: "ACTIVE" },
                data: { status: isAlumni ? "ALUMNI" : "PROMOTED", leftAt: new Date() }
              });

              if (nextClassId) {
                // Check for per-section override first, then auto-match by name
                const overriddenSectionId = sectionOverrideMap.get(student.sectionId);
                let newSectionId;

                if (overriddenSectionId) {
                  // Admin overrode the section
                  newSectionId = newSections.find((s) => s.classId === nextClassId && s.id === overriddenSectionId)?.id ||
                  newSections.find((s) => s.id === overriddenSectionId)?.id;
                }

                if (!newSectionId) {
                  // Auto-match by section name
                  const sectionName = student.section?.name;
                  const newSection = sectionName ?
                  newSections.find((s) => s.classId === nextClassId && s.name === sectionName) :
                  null;
                  newSectionId = newSection?.id || newSections.find((s) => s.classId === nextClassId)?.id;
                }

                if (!newSectionId) {
                  console.warn(`No section found for class ${nextClassId}, skipping student ${student.userId}`);
                  skipped++;
                  continue;
                }

                // 2. Create new StudentSession
                const newSession = await tx.studentSession.create({
                  data: {
                    studentId: student.userId,
                    academicYearId: toYearId,
                    classId: nextClassId,
                    sectionId: newSectionId,
                    rollNumber: student.rollNumber,
                    status: "ACTIVE"
                  }
                });

                // 3. Update Student cache fields + currentSessionId
                await tx.student.update({
                  where: { userId: student.userId },
                  data: {
                    academicYearId: toYearId,
                    classId: nextClassId,
                    sectionId: newSectionId,
                    currentSessionId: newSession.id
                  }
                });

                // 4. Create promotion history
                if (promotedBy) {
                  await tx.promotionHistory.create({
                    data: {
                      studentId: student.userId,
                      fromClassId: student.classId,
                      toClassId: nextClassId,
                      fromSectionId: student.sectionId,
                      toSectionId: newSectionId,
                      fromYearId,
                      toYearId,
                      status: "PROMOTED",
                      promotedBy,
                      batchId
                    }
                  });
                }

                promoted++;
              } else {
                // Alumni: mark student as alumni AND create Alumni record
                await tx.student.update({
                  where: { userId: student.userId },
                  data: {
                    isAlumni: true,
                    alumniConvertedAt: new Date(),
                    DateOfLeaving: new Date().toISOString().split('T')[0]
                  }
                });

                // Create Alumni record so it shows in Alumni Management
                try {
                  await tx.alumni.create({
                    data: {
                      schoolId,
                      originalStudentId: student.userId,
                      admissionNo: student.admissionNo || 'N/A',
                      name: student.name || student.class?.className || 'Unknown',
                      email: student.email || '',
                      contactNumber: student.contactNumber || '',
                      lastClassId: student.classId,
                      lastSectionId: student.sectionId,
                      lastAcademicYear: fromYearId,
                      graduationYear: new Date().getFullYear(),
                      leavingDate: new Date(),
                      leavingReason: 'GRADUATED'
                    }
                  });
                } catch (alumniErr) {
                  console.warn(`[WIZARD] Could not create Alumni record for ${student.userId}:`, alumniErr.message);
                }

                // Create promotion history for alumni
                if (promotedBy) {
                  await tx.promotionHistory.create({
                    data: {
                      studentId: student.userId,
                      fromClassId: student.classId,
                      toClassId: student.classId, // stays same for alumni
                      fromSectionId: student.sectionId,
                      toSectionId: student.sectionId,
                      fromYearId,
                      toYearId,
                      status: "ALUMNI",
                      promotedBy,
                      batchId
                    }
                  });
                }

                alumni++;
              }
            }
          }, { timeout: 300000 }); // 5 min timeout for large student sets

          await prisma.academicYear.update({
            where: { id: toYearId },
            data: { studentsPromoted: true }
          });

          result.promotion = {
            mode: "auto",
            promoted,
            alumni,
            skipped,
            total: students.length,
            notPromoted: students.length - promoted - alumni - skipped,
            batchId
          };
        } else if (promotionMode === "skip") {
          result.promotion = { mode: "skip", message: "Student promotion skipped" };
        }

      } catch (err) {
        console.error("Clone failed:", err);
        result.cloned.error = err.message;
      }
    }

    // ─── Step 4: Mark setup complete ─────────────────────
    const hasClonedData = (result.cloned.classes || 0) > 0;
    console.log("[WIZARD DEBUG] Final result:", JSON.stringify(result));
    if (!hasClonedData) {
      console.warn("[WIZARD WARN] No classes cloned! Check class academicYearId distribution.");
      result.warning = "No classes were found to clone. Check that source classes exist.";
    }
    await prisma.academicYear.update({
      where: { id: toYearId },
      data: { setupComplete: true }
    });

    // Clear academic year cache
    const cacheKey = generateKey('academic-years', { schoolId });
    await delCache(cacheKey);

    return NextResponse.json(result);

  } catch (error) {
    console.error("Start session error:", error);
    return NextResponse.json(
      { error: "Failed to start new session: " + error.message },
      { status: 500 }
    );
  }
});

/**
 * GET /api/schools/[schoolId]/academic-years/start-session
 * 
 * Preview: returns counts of what will be cloned/promoted
 */export const GET = withSchoolAccess(async function GET(req, { params }) {
  try {
    const { schoolId } = await params;

    // Get current active year
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true }
    });

    if (!currentYear) {
      return NextResponse.json({
        hasActiveYear: false,
        preview: null
      });
    }

    // Count everything — classes may not be bound to an academic year yet (legacy data)
    // So we count by schoolId first, then try academicYearId
    const classWhereClause = (await prisma.class.count({ where: { academicYearId: currentYear.id } })) > 0 ?
    { academicYearId: currentYear.id } :
    { schoolId };

    const [
    classes,
    subjects,
    feeStructures,
    students,
    timetableEntries,
    leaveBuckets] =
    await Promise.all([
    prisma.class.count({ where: classWhereClause }),
    prisma.subject.count({
      where: {
        class: classWhereClause
      }
    }),
    prisma.globalFeeStructure.count({ where: { academicYearId: currentYear.id, schoolId, status: 'ACTIVE' } }),
    prisma.student.count({ where: { academicYearId: currentYear.id, schoolId } }),
    prisma.timetableEntry.count({ where: { academicYearId: currentYear.id } }),
    prisma.leaveBucket.count({ where: { academicYearId: currentYear.id, schoolId } })]
    );

    // Get class breakdown for promotion preview
    // Fetch existing future (inactive) years for selection
    // Use relaxed filter: any inactive year that is NOT the current one
    const futureYears = await prisma.academicYear.findMany({
      where: {
        schoolId,
        isActive: false,
        id: { not: currentYear.id },
        // Only show years that start after the current year's start
        // (this includes overlapping years like 2026-27 that starts before 2025-26 ends)
        startDate: { gte: currentYear.startDate }
      },
      select: { id: true, name: true, startDate: true, endDate: true, setupComplete: true },
      orderBy: { startDate: 'asc' }
    });

    // Smart grade-level ordering for promotion
    const GRADE_ORDER = [
    'PLAYGROUP', 'PLAY GROUP', 'PG',
    'NURSERY', 'NUR',
    'PREP', 'KG', 'KINDERGARTEN',
    'LKG', 'LOWER KG',
    'UKG', 'UPPER KG',
    '1', 'I', 'CLASS 1', 'CLASS-1',
    '2', 'II', 'CLASS 2', 'CLASS-2',
    '3', 'III', 'CLASS 3', 'CLASS-3',
    '4', 'IV', 'CLASS 4', 'CLASS-4',
    '5', 'V', 'CLASS 5', 'CLASS-5',
    '6', 'VI', 'CLASS 6', 'CLASS-6',
    '7', 'VII', 'CLASS 7', 'CLASS-7',
    '8', 'VIII', 'CLASS 8', 'CLASS-8',
    '9', 'IX', 'CLASS 9', 'CLASS-9',
    '10', 'X', 'CLASS 10', 'CLASS-10',
    '11', 'XI', 'CLASS 11', 'CLASS-11',
    '12', 'XII', 'CLASS 12', 'CLASS-12'];


    function getGradeIndex(className) {
      const normalized = className.trim().toUpperCase();
      const idx = GRADE_ORDER.indexOf(normalized);
      if (idx !== -1) return idx;
      // Try partial match
      for (let i = 0; i < GRADE_ORDER.length; i++) {
        if (normalized.includes(GRADE_ORDER[i]) || GRADE_ORDER[i].includes(normalized)) {
          return i;
        }
      }
      return 999; // Unknown goes to end
    }

    const classBreakdown = await prisma.class.findMany({
      where: classWhereClause,
      include: {
        _count: { select: { students: true } },
        sections: {
          select: {
            id: true,
            name: true,
            _count: { select: { students: true } }
          }
        }
      }
    });

    // Sort by grade level, not alphabetically
    const sortedClasses = classBreakdown.sort((a, b) => {
      return getGradeIndex(a.className) - getGradeIndex(b.className);
    });

    // Build promotion mapping: each class → next class in order
    const classBreakdownWithPromotion = sortedClasses.map((c, i) => ({
      id: c.id,
      name: c.className,
      students: c._count.students,
      sections: c.sections.map((s) => ({ id: s.id, name: s.name, students: s._count?.students || 0 })),
      promotedTo: i < sortedClasses.length - 1 ?
      {
        id: sortedClasses[i + 1].id,
        name: sortedClasses[i + 1].className,
        sections: sortedClasses[i + 1].sections.map((s) => ({ id: s.id, name: s.name }))
      } :
      null // Last class → Alumni
    }));

    return NextResponse.json({
      hasActiveYear: true,
      currentYear: {
        id: currentYear.id,
        name: currentYear.name,
        startDate: currentYear.startDate,
        endDate: currentYear.endDate
      },
      preview: {
        classesToClone: classes,
        subjectsToClone: subjects,
        feeStructuresToClone: feeStructures,
        studentsToPromote: students,
        timetableEntriesToClone: timetableEntries,
        leaveBucketsToClone: leaveBuckets
      },
      classBreakdown: classBreakdownWithPromotion,
      futureYears
    });

  } catch (error) {
    console.error("Preview session error:", error);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 }
    );
  }
});