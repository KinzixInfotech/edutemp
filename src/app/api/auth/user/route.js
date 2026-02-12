// import prisma from "@/lib/prisma";
// import { NextResponse } from "next/server";

// export async function PUT(req) {
//     try {
//         const body = await req.json();
//         const { id, role, updates } = body; // `updates` is an object of { fieldName: value }

//         if (!id || !role || !updates) {
//             return NextResponse.json({ error: "Missing required data" }, { status: 400 });
//         }

//         let updatedUser;

//         switch (role) {
//             case "STUDENT":
//                 updatedUser = await prisma.student.update({
//                     where: { userId: id },
//                     data: updates,
//                 });
//                 break;

//             case "TEACHER":
//                 updatedUser = await prisma.teacher.update({
//                     where: { userId: id },
//                     data: updates,
//                 });
//                 break;

//             case "ADMIN":
//                 updatedUser = await prisma.admin.update({
//                     where: { userId: id },
//                     data: updates,
//                 });
//                 break;

//             case "SUPER_ADMIN":
//                 updatedUser = await prisma.user.update({
//                     where: { id },
//                     data: updates,
//                 });
//                 break;

//             default:
//                 return NextResponse.json({ error: "Invalid role" }, { status: 400 });
//         }

//         return NextResponse.json({ message: "Profile updated successfully", updatedUser });
//     } catch (err) {
//         console.error("❌ Error updating user:", err);
//         return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//     }
// }
// export async function GET(req) {
//     try {
//         const { searchParams } = new URL(req.url);
//         const email = searchParams.get("email");

//         if (!email) {
//             return NextResponse.json({ error: "Missing email" }, { status: 400 });
//         }

//         const start = performance.now();

//         // Step 1: Fetch user only (without relations)
//         const user = await prisma.User.findUnique({
//             where: { email },
//             select: {
//                 id: true,
//                 email: true,
//                 role: true,
//                 schoolId: true,
//                 name: true,
//                 profilePicture: true,
//                 school: {
//                     select: {
//                         id: true,
//                         name: true,
//                         domain: true,
//                     },
//                 },
//             },
//         });
//         console.log(user, 'from api');

//         if (!user) {
//             return NextResponse.json({ error: "User not found" }, { status: 404 });
//         }

//         let schoolId = null;
//         let studentdatafull = null;
//         let profilePicture = user?.profilePicture || null;
//         let classs = null;
//         let section = null;
//         let school = null;
//         let name = user?.name || null;

//         // Step 2: Fetch schoolId from corresponding model based on role
//         switch (user.role.name) {
//             case "ADMIN":
//                 const admin = await prisma.admin.findUnique({
//                     where: { userId: user.id },
//                     select: {
//                         schoolId: true,
//                         school: true,
//                     },
//                 });
//                 schoolId = admin?.schoolId;
//                 school = admin?.school;
//                 break;
//             case "TEACHING_STAFF":
//                 const teacher = await prisma.teacher.findUnique({
//                     where: { userId: user.id },
//                     select: { schoolId: true },
//                 });
//                 schoolId = teacher?.schoolId;
//                 break;
//             case "NON_TEACHING_STAFF":
//                 const staff = await prisma.staff.findUnique({
//                     where: { userId: user.id },
//                     select: { schoolId: true },
//                 });
//                 schoolId = staff?.schoolId;
//                 break;
//             case "STUDENT":
//                 const student = await prisma.student.findUnique({
//                     where: { userId: user.id },
//                     include: {
//                         class: true,
//                         section: true,
//                     }

//                 })
//                 schoolId = student?.schoolId;
//                 name = student?.name;
//                 studentdatafull = student,
//                     classs = student?.class;
//                 section = student?.section;
//                 // profilePicture = student?.profilePicture;
//                 break;
//         }
//         const end = performance.now();
//         console.log(`🕒 Query took ${end - start, profilePicture} ms`);

//         return NextResponse.json({
//             id: user.id,
//             email: user.email,
//             role: user.role,
//             schoolId,
//             school,
//             name,
//             classs,
//             studentdatafull,
//             section,
//             profilePicture,
//         });
//     } catch (err) {
//         console.error("❌ Error in /api/auth/user:", err);
//         return NextResponse.json({ error: err }, { status: 500 });
//     }
// }



import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

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
// export async function GET(req) {
//     try {
//         const sessionUser = await getAuthenticatedUser(req);
//         if (!sessionUser) {
//             return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//         }

//         const { searchParams } = new URL(req.url);
//         const userId = searchParams.get("userId");

//         if (!userId) {
//             return NextResponse.json({ error: "Missing userId" }, { status: 400 });
//         }

//         // Only SUPER_ADMIN can fetch other users
//         if (sessionUser.id !== userId) {
//             const user = await prisma.user.findUnique({
//                 where: { id: sessionUser.id },
//                 include: { role: true },
//             });
//             if (user.role.name !== "SUPER_ADMIN") {
//                 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//             }
//         }

//         const start = performance.now();

//         // Base user info
//         const user = await prisma.user.findUnique({
//             where: { id: userId },
//             select: {
//                 id: true,
//                 email: true,
//                 name: true,
//                 role: true,
//                 profilePicture: true,
//                 schoolId: true,
//             },
//         });

//         if (!user) {
//             return NextResponse.json({ error: "User not found" }, { status: 404 });
//         }

//         let schoolId = null;
//         let school = null;
//         let classs = null;
//         let section = null;
//         let studentdatafull = null;

//         switch (user.role.name) {
//             case "ADMIN":
//                 const admin = await prisma.admin.findUnique({
//                     where: { userId },
//                     select: { schoolId: true, school: true },
//                 });
//                 schoolId = admin?.schoolId;
//                 school = admin?.school;
//                 break;

//             case "TEACHING_STAFF":
//                 const teacher = await prisma.teacher.findUnique({
//                     where: { userId },
//                     select: { schoolId: true },
//                 });
//                 schoolId = teacher?.schoolId;
//                 break;

//             case "NON_TEACHING_STAFF":
//                 const staff = await prisma.staff.findUnique({
//                     where: { userId },
//                     select: { schoolId: true },
//                 });
//                 schoolId = staff?.schoolId;
//                 break;

//             case "STUDENT":
//                 const student = await prisma.student.findUnique({
//                     where: { userId },
//                     include: { class: true, section: true },
//                 });
//                 schoolId = student?.schoolId;
//                 studentdatafull = student;
//                 classs = student?.class;
//                 section = student?.section;
//                 break;
//             case "PARENT":
//                 const parent = await prisma.parent.findUnique({
//                     where: { userId },
//                     include: {
//                         user: true,          // fetch related User object
//                         school: true,        // fetch related School object
//                         studentLinks: true,  // fetch related StudentParentLink array
//                     },
//                 });

//                 if (!parent) {
//                     return NextResponse.json({ error: "Parent not found" }, { status: 404 });
//                 }
//         }

//         const end = performance.now();
//         console.log(`🕒 User query took ${end - start}ms`);

//         return NextResponse.json({
//             ...user,
//             schoolId,
//             school,
//             classs,
//             section,
//             studentdatafull,
//             parent,
//         });
//     } catch (err) {
//         console.error("❌ Error in GET /api/auth/user:", err);
//         return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//     }
// }
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
            console.log("❌ [API] User not found in database");
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        console.log(`✅ [API] User found: ${user.email} | Role: ${user.role?.name}`);

        // Base response
        let response = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            profilePicture: user.profilePicture,
            schoolId: null,
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
                    return NextResponse.json({ error: "Parent not found" }, { status: 404 });
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
