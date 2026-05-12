import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";
import { withSchoolAccess } from "@/lib/api-auth";

/**
 * GET /api/schools/[schoolId]/teachers/[userId]/students/parent-details
 * 
 * Returns all students in teacher's classes with their parent details
 * in a SINGLE query — eliminates the N+1 problem of fetching each student individually.
 * 
 * Query params:
 *   ?search=<term>  — case-insensitive search across name, admissionNo, rollNumber,
 *                      parent name, parent phone, parent email
 */
export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  try {
    const { schoolId, userId: teacherId } = params;
    const { searchParams } = new URL(req.url);
    const searchQuery = (searchParams.get('search') || '').trim();

    const cacheKey = generateKey('teacher:students:parent-details:v1', {
      schoolId,
      teacherId,
      ...(searchQuery ? { q: searchQuery.toLowerCase() } : {}),
    });

    const result = await remember(cacheKey, async () => {
      // 1. Get teacher's assigned classes and sections
      const teacher = await prisma.teachingStaff.findUnique({
        where: { userId: teacherId },
        include: {
          Class: {
            where: { schoolId },
            select: { id: true, className: true }
          },
          sectionsAssigned: {
            where: { schoolId },
            select: { id: true, name: true, class: { select: { className: true } } }
          }
        }
      });

      if (!teacher) {
        return { students: [] };
      }

      const classIds = teacher.Class.map((c) => c.id);
      const sectionIds = teacher.sectionsAssigned.map((s) => s.id);

      if (classIds.length === 0 && sectionIds.length === 0) {
        return { students: [] };
      }

      // 2. Build WHERE clause with optional search
      const baseWhere = {
        schoolId,
        OR: [
          { sectionId: { in: sectionIds } },
          { classId: { in: classIds } }
        ],
        user: {
          status: 'ACTIVE',
          deletedAt: null
        }
      };

      // Add search conditions if a search query is provided
      if (searchQuery) {
        const q = searchQuery;
        baseWhere.AND = [
          {
            OR: [
              // Student fields
              { user: { name: { contains: q, mode: 'insensitive' } } },
              { user: { email: { contains: q, mode: 'insensitive' } } },
              { admissionNo: { contains: q, mode: 'insensitive' } },
              { rollNumber: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              // Parent fields via links
              { studentParentLinks: { some: { parent: { name: { contains: q, mode: 'insensitive' } } } } },
              { studentParentLinks: { some: { parent: { contactNumber: { contains: q } } } } },
              { studentParentLinks: { some: { parent: { email: { contains: q, mode: 'insensitive' } } } } },
              { studentParentLinks: { some: { parent: { user: { name: { contains: q, mode: 'insensitive' } } } } } },
              { studentParentLinks: { some: { parent: { user: { email: { contains: q, mode: 'insensitive' } } } } } },
              // Legacy inline fields
              { FatherName: { contains: q, mode: 'insensitive' } },
              { MotherName: { contains: q, mode: 'insensitive' } },
              { GuardianName: { contains: q, mode: 'insensitive' } },
              { FatherNumber: { contains: q } },
              { MotherNumber: { contains: q } },
            ]
          }
        ];
      }

      // 3. Fetch ALL students with parent details in ONE query
      const rawStudents = await prisma.student.findMany({
        where: baseWhere,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true
            }
          },
          section: {
            select: {
              id: true,
              name: true,
              class: {
                select: { className: true }
              }
            }
          },
          class: {
            select: {
              id: true,
              className: true
            }
          },
          // Include parent links with parent details — this is the key optimization
          studentParentLinks: {
            where: { isActive: true },
            include: {
              parent: {
                select: {
                  id: true,
                  name: true,
                  contactNumber: true,
                  email: true,
                  user: {
                    select: {
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: [
          { class: { className: 'asc' } },
          { section: { name: 'asc' } },
          { rollNumber: 'asc' }
        ]
      });

      // 4. Map to clean response format
      const students = rawStudents.map((student) => {
        const className = student.section?.class?.className || student.class?.className || '';
        const sectionName = student.section?.name || '';

        // Resolve parent info from links with fallback to inline fields
        const parentLinks = student.studentParentLinks || [];
        const fatherLink = parentLinks.find((l) => l.relation === 'FATHER');
        const motherLink = parentLinks.find((l) => l.relation === 'MOTHER');
        const guardianLink = parentLinks.find((l) =>
          l.relation === 'GUARDIAN' || l.relation === 'GRANDFATHER' ||
          l.relation === 'GRANDMOTHER' || l.relation === 'UNCLE' ||
          l.relation === 'AUNT' || l.relation === 'OTHER'
        );

        return {
          id: student.user.id,
          studentId: student.id,
          name: student.user.name || student.name,
          email: student.user.email,
          profilePicture: student.user.profilePicture,
          rollNumber: student.rollNumber,
          admissionNo: student.admissionNo,
          sectionId: student.sectionId,
          sectionName,
          className,
          // Parent details — resolved from links + inline fallback
          fatherName: fatherLink?.parent?.name || fatherLink?.parent?.user?.name || student.FatherName || null,
          fatherPhone: fatherLink?.parent?.contactNumber || student.FatherNumber || null,
          motherName: motherLink?.parent?.name || motherLink?.parent?.user?.name || student.MotherName || null,
          motherPhone: motherLink?.parent?.contactNumber || student.MotherNumber || null,
          guardianName: guardianLink?.parent?.name || guardianLink?.parent?.user?.name || student.GuardianName || null,
          guardianRelation: guardianLink?.relation || student.GuardianRelation || null,
          guardianPhone: guardianLink?.parent?.contactNumber || null,
          guardianEmail: guardianLink?.parent?.user?.email || guardianLink?.parent?.email || null,
          // All linked parents for full display
          parents: parentLinks.map((link) => ({
            name: link.parent?.name || link.parent?.user?.name,
            relation: link.relation,
            phone: link.parent?.contactNumber,
            email: link.parent?.user?.email || link.parent?.email,
            isPrimary: link.isPrimary
          }))
        };
      });

      return { students };
    }, searchQuery ? 60 : 300); // Shorter cache for searches (1min), 5min for full list

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching teacher's students parent details:", error);
    return NextResponse.json(
      { error: "Failed to fetch parent details" },
      { status: 500 }
    );
  }
});
