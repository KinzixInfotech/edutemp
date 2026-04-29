
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { resolveSchoolIdForUser } from '@/lib/school-account-state';

// Helper: get current user from Supabase session
async function getAuthenticatedUser(req) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return null;

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) return null;
    return data.user; // contains id, email, etc.
}
// ------------------ GET: Get full user data by userId ------------------
export async function GET(req) {
    try {
        console.log("🔍 [API] GET /api/auth/user hit");
        const sessionUser = await getAuthenticatedUser(req);
        if (!sessionUser) {
            console.log("❌ [API] Unlimited access failed: No session user");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        console.log(`🔍 [API] Fetching data for userId: ${userId} | Requested by: ${sessionUser.id}`);

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // Only SUPER_ADMIN can fetch other users
        if (sessionUser.id !== userId) {
            const currentUser = await prisma.user.findUnique({
                where: { id: sessionUser.id },
                include: { role: true },
            });
            if (currentUser.role.name !== "SUPER_ADMIN") {
                console.log("❌ [API] Forbidden: Non-superadmin trying to fetch another user");
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        const start = performance.now();

        // Base user info
        console.log("🔍 [API] Fetching base user info from Prisma...");
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true }, // fetch role relation
        });
        if (!user) {
            console.log("⚠️ [API] User not found");
            return NextResponse.json({ user: null, found: false }, { status: 200 });
        }

        const resolvedSchoolId = await resolveSchoolIdForUser(user);

        console.log(`✅ [API] User found: ${user.email} | Role: ${user.role?.name}`);

        // Base response
        let response = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            profilePicture: user.profilePicture,
            schoolId: resolvedSchoolId,
            twoFactorEnabled: user.twoFactorEnabled || false,
        };

        // Role-specific fetch
        console.log(`🔍 [API] Fetching specific details for role: ${user.role.name}`);
        switch (user.role.name) {
            case "ADMIN": {
                const admin = await prisma.admin.findUnique({
                    where: { userId },
                    include: { school: true }, // fetch related school
                });
                console.log("✅ [API] Admin details fetched:", admin ? "Found" : "Not Found");
                response.schoolId = admin?.schoolId;
                response.school = admin?.school;
                break;
            }
            case "TEACHING_STAFF": {
                const teacher = await prisma.teachingStaff.findUnique({
                    where: { userId },
                    include: {
                        school: true,
                        department: true,
                    },
                });
                console.log("✅ [API] Teaching Staff details fetched:", teacher ? "Found" : "Not Found");
                response.schoolId = teacher?.schoolId;
                response.school = teacher?.school;
                response.teacherData = teacher;
                break;
            }
            case "NON_TEACHING_STAFF": {
                const staff = await prisma.nonTeachingStaff.findUnique({
                    where: { userId },
                    select: { schoolId: true },
                });
                console.log("✅ [API] Non-Teaching Staff details fetched:", staff ? "Found" : "Not Found");
                response.schoolId = staff?.schoolId;
                break;
            }
            case "STUDENT": {
                const student = await prisma.student.findUnique({
                    where: { userId },
                    include: { class: true, section: true, school: true },
                });
                console.log("✅ [API] Student details fetched:", student ? "Found" : "Not Found");
                response.schoolId = student?.schoolId;
                response.studentData = student;
                response.class = student?.class;
                response.section = student?.section;
                response.school = student?.school;
                break;
            }
            case "PARENT": {
                const parent = await prisma.parent.findUnique({
                    where: { userId },
                    include: {
                        user: true,          // fetch related User object
                        school: true,        // fetch related School object
                        studentLinks: {
                            include: {
                                student: {
                                    include: {
                                        class: true,
                                        section: true,
                                        user: true,
                                    }
                                }
                            }
                        },  // fetch related StudentParentLink array with student details
                    },
                });
                console.log("✅ [API] Parent details fetched:", parent ? "Found" : "Not Found");
                if (!parent) {
                    console.log("⚠️ [API] Parent not found → returning null");
                    response.parentData = null;
                }
                response.schoolId = parent?.schoolId;
                response.parentData = parent;
                response.school = parent?.school;
                break;
            }
            case "LIBRARIAN": {
                const librarian = await prisma.librarian.findUnique({
                    where: { userId },
                    include: { school: true },
                });
                console.log("✅ [API] Librarian details fetched:", librarian ? "Found" : "Not Found");
                response.schoolId = librarian?.schoolId;
                response.school = librarian?.school;
                response.librarianData = librarian;
                break;
            }
            case "ACCOUNTANT": {
                const accountant = await prisma.accountant.findUnique({
                    where: { userId },
                    include: { school: true },
                });
                console.log("✅ [API] Accountant details fetched:", accountant ? "Found" : "Not Found");
                response.schoolId = accountant?.schoolId;
                response.school = accountant?.school;
                response.accountantData = accountant;
                break;
            }
            case "DIRECTOR": {
                const director = await prisma.director.findUnique({
                    where: { userId },
                    include: { school: true },
                });
                console.log("✅ [API] Director details fetched:", director ? "Found" : "Not Found");
                response.schoolId = director?.schoolId;
                response.school = director?.school;
                response.directorData = director;
                break;
            }
            case "PRINCIPAL": {
                const principal = await prisma.principal.findUnique({
                    where: { userId },
                    include: { school: true },
                });
                console.log("✅ [API] Principal details fetched:", principal ? "Found" : "Not Found");
                response.schoolId = principal?.schoolId;
                response.school = principal?.school;
                response.principalData = principal;
                break;
            }
            case "PARTNER": {
                const partner = await prisma.partner.findUnique({
                    where: { userId },
                    include: { user: true },
                });
                console.log("✅ [API] Partner details fetched:", partner ? "Found" : "Not Found");
                response.partner = partner;
                break;
            }
            case "DRIVER":
            case "CONDUCTOR": {
                const transportStaff = await prisma.transportStaff.findUnique({
                    where: { userId },
                    include: {
                        school: true,
                        vehicleAssignments: {
                            where: { isActive: true },
                            include: {
                                vehicle: {
                                    select: { id: true, licensePlate: true, model: true, capacity: true, fuelType: true, mileage: true }
                                }
                            }
                        },
                        driverRouteAssignments: {
                            where: { isActive: true },
                            include: {
                                vehicle: {
                                    select: { id: true, licensePlate: true, model: true, capacity: true, fuelType: true, mileage: true }
                                },
                                route: {
                                    select: { id: true, name: true }
                                }
                            }
                        },
                        conductorRouteAssignments: {
                            where: { isActive: true },
                            include: {
                                vehicle: {
                                    select: { id: true, licensePlate: true, model: true, capacity: true, fuelType: true, mileage: true }
                                },
                                route: {
                                    select: { id: true, name: true }
                                }
                            }
                        }
                    },
                });
                console.log("✅ [API] Transport Staff details fetched:", transportStaff ? "Found" : "Not Found");
                response.schoolId = transportStaff?.schoolId;
                response.school = transportStaff?.school;
                response.transportStaffData = transportStaff;
                break;
            }
            case "PARTNER": {
                const partner = await prisma.partner.findUnique({
                    where: { userId },
                    include: { user: true },
                });
                console.log("✅ [API] Partner details fetched:", partner ? "Found" : "Not Found");
                response.partner = partner;
                break;
            }
            default:
                console.log("⚠️ [API] Unhandled role:", user.role.name);
        }

        const end = performance.now();
        console.log(`🕒 [API] Request completed in ${end - start}ms`);

        return NextResponse.json(response);
    } catch (err) {
        console.error("❌ [API] Critical Error in GET /api/auth/user:", err);
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}
// ------------------ PUT: Update user profile ------------------
export async function PUT(req) {
    try {
        const sessionUser = await getAuthenticatedUser(req);
        if (!sessionUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id, role, updates } = body;

        if (!id || !role || !updates) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const targetUser = await prisma.user.findUnique({
            where: { id },
            include: { role: true },
        });

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const resolvedSchoolId = await resolveSchoolIdForUser(targetUser);
        const schoolAccess = await enforceSchoolStateAccess({
            schoolId: resolvedSchoolId,
            method: req.method,
            bypass: targetUser.role?.name === 'SUPER_ADMIN',
        });
        if (!schoolAccess.ok) {
            return schoolAccess.response;
        }

        // Only allow self-update unless SUPER_ADMIN
        if (sessionUser.id !== id) {
            const user = await prisma.user.findUnique({
                where: { id: sessionUser.id },
                include: { role: true },
            });
            if (user.role.name !== "SUPER_ADMIN") {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        let updatedUser;

        switch (role) {
            case "STUDENT":
                updatedUser = await prisma.student.update({
                    where: { userId: id },
                    data: updates,
                });
                break;
            case "TEACHING_STAFF":
                updatedUser = await prisma.teachingStaff.update({
                    where: { userId: id },
                    data: updates,
                });
                break;
            case "ADMIN":
                updatedUser = await prisma.admin.update({
                    where: { userId: id },
                    data: updates,
                });
                break;
            case "DIRECTOR":
                // Director's name is on User table, not Director table
                updatedUser = await prisma.user.update({
                    where: { id },
                    data: updates,
                });
                break;
            case "PRINCIPAL":
                // Principal's name is on User table, not Principal table
                updatedUser = await prisma.user.update({
                    where: { id },
                    data: updates,
                });
                break;
            case "SUPER_ADMIN":
                updatedUser = await prisma.user.update({
                    where: { id },
                    data: updates,
                });
                break;
            default:
                return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        return NextResponse.json({ message: "Profile updated successfully", updatedUser });
    } catch (err) {
        console.error("❌ Error updating user:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
