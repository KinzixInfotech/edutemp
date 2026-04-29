import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPagination, apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey } from "@/lib/cache";

// GET - Get students in a class with search, filters, pagination
export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  try {
    const { schoolId, classId } = params;
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim() || "";
    const sectionId = searchParams.get("sectionId");
    const status = searchParams.get("status"); // active | alumni
    const gender = searchParams.get("gender");
    const sortBy = searchParams.get("sortBy") || "roll_asc";
    const { page, limit, skip } = getPagination(req);

    // Build where clause
    const where = {
      schoolId,
      classId: parseInt(classId)
    };

    // Status filter
    if (status === "active") where.isAlumni = false;else
    if (status === "alumni") where.isAlumni = true;else
    where.isAlumni = false; // Default: active only

    // Section filter
    if (sectionId) where.sectionId = parseInt(sectionId);

    // Gender filter
    if (gender) where.gender = gender;

    // Search filter
    if (search) {
      where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { admissionNo: { contains: search, mode: "insensitive" } },
      { rollNumber: { contains: search, mode: "insensitive" } },
      { FatherName: { contains: search, mode: "insensitive" } },
      { MotherName: { contains: search, mode: "insensitive" } },
      { contactNumber: { contains: search, mode: "insensitive" } }];

    }

    // Sort order
    let orderBy = { rollNumber: "asc" };
    switch (sortBy) {
      case "name_asc":orderBy = { name: "asc" };break;
      case "name_desc":orderBy = { name: "desc" };break;
      case "roll_desc":orderBy = { rollNumber: "desc" };break;
      case "admission_asc":orderBy = { admissionDate: "asc" };break;
      case "admission_desc":orderBy = { admissionDate: "desc" };break;
      default:orderBy = { rollNumber: "asc" };break;
    }

    const select = {
      userId: true,
      name: true,
      rollNumber: true,
      admissionNo: true,
      admissionDate: true,
      contactNumber: true,
      isAlumni: true,
      email: true,
      gender: true,
      FatherName: true,
      MotherName: true,
      House: true,
      bloodGroup: true,
      user: {
        select: {
          name: true,
          profilePicture: true
        }
      },
      section: {
        select: {
          id: true,
          name: true
        }
      }
    };

    const isAll = limit === -1;

    if (isAll) {
      const students = await prisma.student.findMany({
        where,
        select,
        orderBy
      });
      return NextResponse.json(students);
    }

    const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      select,
      orderBy,
      skip,
      take: limit
    }),
    prisma.student.count({ where })]
    );

    return NextResponse.json({
      students,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error fetching class students:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
});