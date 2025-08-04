import { NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supbase-admin";
const userSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string(),
    profilePicture: z.string().optional(), // optional for now
})

export async function POST(req) {
    let createdUserId = null;
    try {
        const body = await req.json()
        const parsed = userSchema.safeParse(body)
        console.log(body)
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 })
        }

        const { email, name, password, profilePicture } = parsed.data
        console.log(email)


        // Check if email already exists
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            return NextResponse.json({ error: "Email already exists" }, { status: 409 })
        }
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
        });
        createdUserId = authUser?.user?.id;

        if (authError || !authUser?.user?.id) {
            throw new Error(`Supabase Auth Error: ${authError?.message || "Unknown error"}`);
        }
        await supabaseAdmin.auth.admin.updateUserById(createdUserId, {
            user_metadata: {
                name: name,
                profilePicture: profilePicture || "",
            },
        });
        // 🧠 Ensure Role exists
        const created = await prisma.$transaction(async (tx) => {
            // Ensure SUPER_ADMIN in Role exists
            const role = await prisma.role.upsert({
                where: { name: "SUPER_ADMIN" },
                update: {},
                create: { name: "SUPER_ADMIN" },
            });
            // create new user in prisma 
            const newUser = await tx.user.create({
                data: {
                    name: name,
                    id: createdUserId,
                    email: email,
                    password: password,
                    role: { connect: { id: role.id } },
                    email,
                    profilePicture: profilePicture || "https://i.pinimg.com/236x/1e/04/4e/1e044ef9a29d39504d82ceb7ac0c4cd9.jpg",
                },
                include: {
                    role: true,
                    school: true,
                },
            })
            return { newUser };
        });
        return NextResponse.json({ success: true, ...created });
    } catch (err) {
        console.error("❌ User profile creation error:", err);
        if (createdUserId) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(createdUserId);
                console.log(`🧹 Deleted Supabase user: ${createdUserId}`);
            } catch (cleanupError) {
                console.error("⚠️ Supabase cleanup failed:", cleanupError);
            }
        }
        return NextResponse.json(
            { error: err.message || "Failed to create profile" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const superadmins = await prisma.user.findMany({
            where: { roleId: 1 }, // assuming 1 is Superadmin
            orderBy: { createdAt: "desc" },
        })
        return NextResponse.json(superadmins)
    } catch (err) {
        console.error("[SUPERADMIN_FETCH]", err)
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
    }
}
