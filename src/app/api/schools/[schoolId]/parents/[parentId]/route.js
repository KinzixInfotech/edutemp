import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { remember, generateKey, invalidatePattern, setCache } from "@/lib/cache";

export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  const { schoolId, parentId } = params;

  try {
    const cacheKey = generateKey('parent:profile', { schoolId, parentId });

    const parent = await remember(cacheKey, async () => {
      return await prisma.parent.findUnique({
        where: { id: parentId, schoolId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profilePicture: true,
              status: true,
              createdAt: true,
              updatedAt: true
            }
          },
          studentLinks: {
            where: { isActive: true },
            include: {
              student: {
                select: {
                  userId: true,
                  name: true,
                  admissionNo: true,
                  rollNumber: true,
                  gender: true,
                  dob: true,
                  bloodGroup: true,
                  contactNumber: true,
                  email: true,
                  Address: true,
                  city: true,
                  state: true,
                  country: true,
                  postalCode: true,
                  FatherName: true,
                  MotherName: true,
                  FatherNumber: true,
                  MotherNumber: true,
                  GuardianName: true,
                  GuardianRelation: true,
                  isAlumni: true,
                  class: { select: { id: true, className: true } },
                  section: { select: { id: true, name: true } },
                  user: {
                    select: {
                      profilePicture: true,
                      status: true,
                      email: true
                    }
                  },
                  studentParentLinks: {
                    where: { isActive: true },
                    include: {
                      parent: {
                        include: {
                          user: {
                            select: {
                              profilePicture: true,
                              status: true,
                              email: true
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
    }, 300);

    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    return NextResponse.json(parent);
  } catch (error) {
    console.error("[PARENT_GET]", error);
    return NextResponse.json({ error: "Failed to fetch parent" }, { status: 500 });
  }
});

export const PATCH = withSchoolAccess(async function PATCH(req, props) {
  const params = await props.params;
  const { schoolId, parentId } = params;

  try {
    const body = await req.json();

    const allowedFields = [
    'name', 'email', 'contactNumber', 'alternateNumber', 'bloodGroup',
    'address', 'city', 'state', 'country', 'postalCode',
    'occupation', 'qualification', 'annualIncome',
    'emergencyContactName', 'emergencyContactNumber', 'emergencyContactRelation'];


    const updateData = {};
    for (const key of allowedFields) {
      if (key in body) {
        updateData[key] = body[key] || null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await prisma.parent.update({
      where: { id: parentId, schoolId },
      data: updateData
    });

    // Overwrite the cached profile with TTL 0 effectively by setting fresh data
    // (remember() won't re-fetch since cache exists, so we force-set updated data)
    const cacheKey = generateKey('parent:profile', { schoolId, parentId });
    await setCache(cacheKey, null, 1); // expire in 1 second = effectively invalidate

    // Invalidate parent list caches + profile caches
    await invalidatePattern('parents:list*');
    await invalidatePattern('parent:profile*');
    await invalidatePattern('parents:search*');

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PARENT_PATCH]", error);
    return NextResponse.json({ error: "Failed to update parent" }, { status: 500 });
  }
});