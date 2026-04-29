import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supbase-admin";
import { enforceSchoolStateAccess } from "@/lib/school-account-state";

/**
 * POST /api/auth/verify-oauth
 *
 * Verifies that an OAuth-authenticated user (Google/Apple) exists in our
 * Prisma database. If the user is NOT found, this endpoint automatically
 * deletes the orphan Supabase auth user that was auto-created during OAuth.
 *
 * This is critical for ERP systems where only pre-created users should
 * be able to log in — no public signup is allowed.
 *
 * Body: { accessToken: string, provider: "google" | "apple" }
 * Returns:
 *   200 { id, email, role, ... }                         — user found, login allowed
 *   200 { user: null, linked: false, message: "..." }    — user not in DB, orphan deleted
 *   401 { error: "..." }                                 — invalid token
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { accessToken, provider } = body;

        if (!accessToken) {
            return NextResponse.json(
                { error: "Missing accessToken" },
                { status: 400 }
            );
        }

        // 1. Validate the Supabase session and get the authenticated user
        const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

        if (authError || !authData?.user) {
            console.log("❌ [verify-oauth] Invalid token:", authError?.message);
            return NextResponse.json(
                { error: "Invalid or expired session" },
                { status: 401 }
            );
        }

        const supabaseUser = authData.user;
        const supabaseUserId = supabaseUser.id;
        const email = supabaseUser.email;

        console.log(`🔍 [verify-oauth] Verifying OAuth user: ${email} (provider: ${provider}, supabaseId: ${supabaseUserId})`);

        // 2. Look up the user in Prisma by email
        const prismaUser = await prisma.user.findUnique({
            where: { email },
            include: { role: true },
        });

        // 3a. User EXISTS in Prisma → return full user data (same format as /api/auth/user)
        if (prismaUser) {
            console.log(`✅ [verify-oauth] User found in DB: ${prismaUser.email} (role: ${prismaUser.role?.name})`);

            // Build full response matching /api/auth/user format
            let response = {
                id: prismaUser.id,
                email: prismaUser.email,
                name: prismaUser.name,
                role: prismaUser.role,
                profilePicture: prismaUser.profilePicture,
                schoolId: null,
                twoFactorEnabled: prismaUser.twoFactorEnabled || false,
            };

            // Fetch role-specific data
            response = await enrichUserByRole(response, prismaUser);

            if (response.schoolId) {
                const schoolAccess = await enforceSchoolStateAccess({
                    schoolId: response.schoolId,
                    method: req.method,
                    allowPastDueWrite: true,
                });
                if (!schoolAccess.ok) {
                    return schoolAccess.response;
                }
            }

            return NextResponse.json(response);
        }

        // 3b. User NOT in Prisma → clean up the orphan Supabase auth user
        console.log(`⚠️ [verify-oauth] User NOT found in DB: ${email}`);

        // Delete the orphan Supabase auth user (only this specific user by ID)
        console.log(`🗑️ [verify-oauth] Deleting orphan Supabase user: ${supabaseUserId} (${email})`);
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);

        if (deleteError) {
            console.error(`❌ [verify-oauth] Failed to delete Supabase user ${supabaseUserId}:`, deleteError.message);
            // Even if deletion fails, still reject the login — don't crash
        } else {
            console.log(
                `✅ [verify-oauth] Successfully deleted orphan Supabase user: ${supabaseUserId} | ` +
                `Email: ${email} | Provider: ${provider}`
            );
        }

        return NextResponse.json({
            user: null,
            linked: false,
            deleted: !deleteError,
            message: "No account found for this email. Please contact your school admin to create your account.",
        });
    } catch (err) {
        console.error("❌ [verify-oauth] Critical error:", err);
        return NextResponse.json(
            { error: "Internal server error", details: err.message },
            { status: 500 }
        );
    }
}

/**
 * Enriches the user response with role-specific data.
 * Mirrors the logic in GET /api/auth/user.
 */
async function enrichUserByRole(response, prismaUser) {
    const userId = prismaUser.id;

    switch (prismaUser.role?.name) {
        case "ADMIN": {
            const admin = await prisma.admin.findUnique({
                where: { userId },
                include: { school: true },
            });
            response.schoolId = admin?.schoolId;
            response.school = admin?.school;
            break;
        }
        case "TEACHING_STAFF": {
            const teacher = await prisma.teachingStaff.findUnique({
                where: { userId },
                include: { school: true, department: true },
            });
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
            response.schoolId = staff?.schoolId;
            break;
        }
        case "STUDENT": {
            const student = await prisma.student.findUnique({
                where: { userId },
                include: { class: true, section: true, school: true },
            });
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
                    user: true,
                    school: true,
                    studentLinks: {
                        include: {
                            student: {
                                include: { class: true, section: true, user: true },
                            },
                        },
                    },
                },
            });
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
                                select: { id: true, licensePlate: true, model: true, capacity: true, fuelType: true, mileage: true },
                            },
                        },
                    },
                    driverRouteAssignments: {
                        where: { isActive: true },
                        include: {
                            vehicle: {
                                select: { id: true, licensePlate: true, model: true, capacity: true, fuelType: true, mileage: true },
                            },
                            route: { select: { id: true, name: true } },
                        },
                    },
                    conductorRouteAssignments: {
                        where: { isActive: true },
                        include: {
                            vehicle: {
                                select: { id: true, licensePlate: true, model: true, capacity: true, fuelType: true, mileage: true },
                            },
                            route: { select: { id: true, name: true } },
                        },
                    },
                },
            });
            response.schoolId = transportStaff?.schoolId;
            response.school = transportStaff?.school;
            response.transportStaffData = transportStaff;
            break;
        }
        default:
            console.log("⚠️ [verify-oauth] Unhandled role:", prismaUser.role?.name);
    }

    return response;
}
