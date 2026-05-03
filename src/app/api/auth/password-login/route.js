import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import prisma from "@/lib/prisma";
import { normalizePhoneNumber, normalizeStudentIdentifier } from "@/lib/auth-identifiers";
import { enforceSchoolStateAccess } from "@/lib/school-account-state";

const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const loginSchema = z.object({
    schoolId: z.string().uuid(),
    role: z.enum(["parent", "student", "teacher", "driver"]),
    identifier: z.string().min(1),
    password: z.string().min(1),
    captchaToken: z.string().optional().nullable(),
});

async function resolveAuthEmail({ schoolId, role, identifier }) {
    if (role === "parent") {
        const normalizedPhone = normalizePhoneNumber(identifier);
        if (!/^\d{10}$/.test(normalizedPhone)) {
            return { error: "Use a valid 10-digit mobile number." };
        }

        const parent = await prisma.parent.findFirst({
            where: {
                schoolId,
                contactNumber: normalizedPhone,
            },
            include: {
                user: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        if (!parent?.user) {
            return { error: "No account found for this school." };
        }

        return {
            authEmail: parent.user.email,
            userId: parent.userId,
        };
    }

    if (role === "student") {
        const normalizedStudentId = normalizeStudentIdentifier(identifier);
        const student = await prisma.student.findFirst({
            where: {
                schoolId,
                admissionNo: normalizedStudentId,
            },
            include: {
                user: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        if (!student?.user) {
            return { error: "No account found for this school." };
        }

        return {
            authEmail: student.user.email,
            userId: student.userId,
        };
    }

    const normalizedEmail = String(identifier || "").trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
        return { error: role === "driver" ? "Use your work email to sign in." : "Use your email address to sign in." };
    }

    const user = await prisma.user.findFirst({
        where: {
            email: normalizedEmail,
            schoolId,
            role: role === "driver"
                ? { name: { in: ["DRIVER", "CONDUCTOR"] } }
                : { name: { in: ["ADMIN", "TEACHING_STAFF", "NON_TEACHING_STAFF", "LIBRARIAN", "ACCOUNTANT", "DIRECTOR", "PRINCIPAL"] } },
        },
        include: {
            role: true,
        },
    });

    if (!user) {
        return { error: "No account found for this school." };
    }

    return {
        authEmail: user.email,
        userId: user.id,
    };
}

export async function POST(request) {
    try {
        const payload = loginSchema.parse(await request.json());
        const schoolAccess = await enforceSchoolStateAccess({
            schoolId: payload.schoolId,
            method: request.method,
            allowPastDueWrite: true,
        });

        if (!schoolAccess.ok) {
            return schoolAccess.response;
        }

        const resolved = await resolveAuthEmail(payload);
        if (resolved.error || !resolved.authEmail) {
            return NextResponse.json(
                { error: resolved.error || "No account found for this school." },
                { status: 404 },
            );
        }

        const { data, error } = await supabaseServer.auth.signInWithPassword({
            email: resolved.authEmail,
            password: payload.password,
            options: payload.captchaToken ? { captchaToken: payload.captchaToken } : undefined,
        });

        if (error || !data?.session || !data?.user) {
            return NextResponse.json(
                { error: "Invalid credentials. Please try again." },
                { status: 401 },
            );
        }

        return NextResponse.json({
            success: true,
            userId: resolved.userId,
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
                expires_in: data.session.expires_in,
                token_type: data.session.token_type,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: "Invalid login details.",
                    fieldErrors: error.flatten().fieldErrors,
                },
                { status: 400 },
            );
        }

        console.error("[PASSWORD_LOGIN]", error);
        return NextResponse.json(
            { error: "Login failed. Please try again." },
            { status: 500 },
        );
    }
}
